# N279 — Event and activity logs never lose data — append-only JSONL, project-root paths, offset reader, pruning

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

Every Claude tool call rewrites the whole per-task `events.json` (up to 300 KB, 210 tracked files). The first time the file fails to parse, the history is wiped, and one bare `--data` flag is enough to cause that. Hook events are filed under whatever task is globally "current", and the folder is found by a `readdir` prefix match.

The activity log path resolves against the current working directory, so 20 stray log files (10,007 lines) sit around this repo, unseen by the dashboard. The dashboard's `ActivityEngine` re-reads the whole file on every change and loses partial lines. It stalls when the file shrinks, truncates the file on start while hooks are still appending, and never clears its poll timer. Every `events.json` write also makes every open tab re-fetch all shards. `~/.insight-flow` has grown to 378 files / 20 MB and is never pruned. Some generated files are not gitignored.

Source: `N271/AUDIT.md` **A10, A29, A30, A31, A32, A75**.

## Goal

1. High-volume tool events are appended (never rewritten), and `events.json` is never overwritten after a failed parse.
2. Events go to the task the session is actually working on, in that task's real folder.
3. Every log path resolves from the project root.
4. The dashboard reads the activity log incrementally, without losing or duplicating lines and without truncating it under writers.
5. Hook writes no longer trigger shard re-fetches. Old session files are pruned, and generated files are gitignored.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/log-event.ts` — `loadEvents` (~:51-60), event writers (~:195-222, :309-318), task resolution (~:30-38, :179-189), session bookkeeping (~:88-135), log path (~:65).
- `packages/taskflow/src/cli/commands/log-activity.ts` — path (:12), rotation on append (:17).
- `packages/taskflow/src/dashboard/server/activity.ts` (whole engine).
- `packages/taskflow/src/dashboard/server/index.ts` — activity paths (:711, :721, ~:1343), watcher callbacks (:184, :197, :222, :1651-1658), and every reader of `events.json` (grep).
- `packages/taskflow/src/core/schema` (events schema, if element-level parsing needs it).
- `packages/taskflow/src/agents/init/index.ts` — scaffolded `.gitignore` (~:382-394).
- Root `.gitignore`; `git rm --cached` the tracked `playground/insightFlow/events/*.jsonl`.
- Tests.

### Out of scope

- Bash hook script changes (quoting, `$CLAUDE_PROJECT_DIR` in the script, stdout, fast path) → N280.
- Untracking the 210 `events.json` files from git (locked default: they stay tracked).
- `events.hooks` trust → N274.

## Implementation plan

1. **Split events (A10).** Hook-noise events (`tool-requested`, `tool-approved` and other `tool-*` types) are appended to a per-task JSONL (e.g. `<task>/events.jsonl`) with `appendFileSync`, one JSON line each. `events.json` keeps lifecycle events only, written via N277's `atomicWriteJson` under the lock. Map every reader first (grep `events.json` across `src/`) and update them to merge both sources where they need tool events (dashboard `/log/status`, event stream, timeline).
2. **Never rewrite after a failed parse (A10).** `loadEvents`:
   - if JSON parsing fails, rename the file to `events.json.corrupt-<ts>`, warn on stderr, and start a new file;
   - if schema validation fails, keep the elements that validate and drop the rest (one warning).
   Validate `--data` / payload is a plain object; else error (exit 2).
3. **Right task, right folder (A75).**
   - Resolve the folder from the shard's `task.folder` (`loadTaskById`), not a `readdir` prefix.
   - Attribution order: explicit `--task` → session → task mapping (written when a lifecycle command with `--id` runs in that session) → `currentTaskId`.
4. **Project-root paths (A29).** `resolve(resolveProjectRoot(), logFile)` in `log-event.ts`, `log-activity.ts`, and the dashboard's activity path, hook-status detection and `/api/include-doc` candidates.
5. **Incremental activity reader (A30).**
   - `start()` no longer rewrites the file; it seeds from the tail (last `maxEvents` lines).
   - Read from the last byte offset with `openSync` / `readSync`, keeping a carry buffer for a partial last line.
   - Reset when the file shrinks.
   - `stop()` clears the poll interval.
   - Rotation happens on the writer side: `log-activity` renames the file to `.1` when it exceeds a size cap (e.g. 5 MB). The engine handles a rename like a shrink.
6. **Quiet watcher (A31).** Pass the filename from `fs.watch`; ignore `events.json`, `events.jsonl` and anything that is not a shard, `master.json` or a side file. Optionally cache side files by mtime in `hydrateShardJson`.
7. **Pruning and ignores (A32).**
   - On dashboard or master start, delete `~/.insight-flow/events-*.jsonl` older than 14 days and `.active` flags older than 24 h. Use constants with a `ponytail:` comment noting the ceiling.
   - The scaffolded consumer `.gitignore` adds `insightFlow/events/` and `.taskflow-activity.last-skill`.
   - The repo `.gitignore` uses `**/insightFlow/events/`, and the tracked `playground/insightFlow/events/2026-06-11.jsonl` is removed from the index.
8. **Tests.**
   - Corrupt `events.json` → renamed aside, not wiped; one bad element → others kept; bare `--data` → error.
   - 50 parallel tool-event appends → 50 lines.
   - Event filed under the session's task.
   - Log path from a subdirectory cwd lands in the project root.
   - `ActivityEngine`: partial line completed later is emitted once; shrink resets; `stop()` clears timers; start does not truncate.
   - Watcher ignores `events.json`.
   - Pruning removes only old files.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new `ActivityEngine` and events tests.
- Manual: run `insight-flow ui`, work in a Claude session from a subdirectory (`cd packages/taskflow`) → tool activity appears in the dashboard feed, and no new `.taskflow-activity.jsonl` appears under `packages/`.
- `git status` after a session shows no rewritten `events.json` for tool-only activity.
- `ls ~/.insight-flow | wc -l` drops after a dashboard start (old files pruned).

## Notes

- Detail and evidence: `N271/AUDIT.md` A10, A29–A32, A75. The 13.9 % malformed-line issue in the activity log comes from the bash hook and is fixed in N280.
- **Depends on N278** (strict `--data` / `--task` parsing) and therefore on N277 / N267. Coordinate with N274, which also edits `log-event.ts`.
- Project memory: `events.json` files show as dirty during sessions because hooks rewrite them. This task removes most of that churn.
- Recommended run: `/task-analyze N279` → `/task-implement N279`.
