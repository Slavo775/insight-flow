# N279 — Event and activity logs never lose data — append-only JSONL, project-root paths, offset reader, pruning — Checklist

## Done criteria

- [ ] `tool-*` hook events are appended to a per-task JSONL; `events.json` holds lifecycle events only, written atomically under the lock (A10)
- [ ] Every reader of task events is updated for the split (A10)
- [ ] A corrupt `events.json` is renamed aside, never overwritten; invalid elements are dropped individually; a non-object `--data` is an error (A10)
- [ ] The event folder comes from the shard's `task.folder`; attribution prefers `--task`, then the session's task, then `currentTaskId` (A75)
- [ ] Activity log paths resolve from the project root in `log-event`, `log-activity` and the dashboard (A29)
- [ ] `ActivityEngine` reads by byte offset with a carry buffer, resets on shrink, never truncates on start, clears its poll on `stop()`; the writer rotates at a size cap (A30)
- [ ] The dashboard watcher ignores `events.json` / `events.jsonl` and other non-shard files (A31)
- [ ] Old `~/.insight-flow` session files are pruned on start; consumer and repo `.gitignore` cover `insightFlow/events/` and `.last-skill`; tracked playground events jsonl removed from the index (A32)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`log-event`, `log-activity`, `event-stream`, `log-events-endpoint`, `e2e-smoke` green)

## Verification

- [ ] Tests: corrupt-file handling, 50 parallel appends, session attribution, subdirectory cwd, ActivityEngine partial line / shrink / stop, watcher filtering, pruning
- [ ] Manual: activity from a session started in a subdirectory shows in the dashboard; no new stray log file
- [ ] Manual: tool-only activity no longer dirties `events.json` in `git status`
