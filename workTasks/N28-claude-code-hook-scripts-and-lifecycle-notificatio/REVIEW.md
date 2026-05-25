# N28 — Claude Code hook scripts and lifecycle notification wiring — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** https://github.com/Slavo775/insight-flow/pull/21
**Verdict:** approved

## Summary

N28 adds 6 Claude Code lifecycle hook scripts (`SessionStart`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`) wired into `.claude/settings.json`, plus an `install-lifecycle-hooks` CLI subcommand and automatic invocation from `insight-flow init`. All scripts follow the N27 `log-event --source hook --if-active` pattern; activation scoping, terminal bell, and macOS OS notifications are correctly implemented. Risk is low — hooks are additive, fail-silent (`2>/dev/null || true`), and the existing activity/enrichment hooks are untouched.

## Checklist verification

- [x] 6 lifecycle hook script constants defined in `activity-hook.ts` — **pass** (`LIFECYCLE_SESSION_START_SCRIPT` … `LIFECYCLE_PERMISSION_SCRIPT`, lines 277–369)
- [x] `installLifecycleHooks(cwd, insightFlowBin?)` exported; writes to `.claude/hooks/` with mode `0o755`; idempotent — **pass** (line 376–441; skips if `existsSync(hookPath)`)
- [x] Hook registrations merged into `.claude/settings.json` (not `settings.local.json`) for all 6 events — **pass** (line 403; playground `settings.json` confirms all 6 entries)
- [x] `lifecycle-agent-active.sh` detects skill names via `case` statement; non-matching prompts exit 0 — **pass** (lines 298–305 in template constant)
- [x] `lifecycle-permission.sh` calls `printf '\a'` and guarded `osascript` alert after logging — **pass** (lines 364–368)
- [x] `lifecycle-agent-idle.sh` sends `osascript` "Agent idle" notification after `log-event agent-idle --if-active` — **pass** (lines 316–319)
- [x] `install-lifecycle-hooks` CLI subcommand; `--bin` flag accepted; prints result JSON — **pass** (`commands/install-lifecycle-hooks.ts`; `opts.bin` at line 8)
- [x] `insight-flow init` calls `installLifecycleHooks` and prints hook count message — **pass** (`init/index.ts` line 215; `generateLifecycleHooks` helper at line 467)
- [x] `pnpm --dir packages/taskflow run build` passes — **pass** (verified)
- [x] `pnpm --dir packages/taskflow test` passes (no regressions) — **pass** (4/4 tests green)
- [x] No regressions to existing activity/enrichment hooks — **pass** (only additive changes to `activity-hook.ts`)

## Non-blocking

1. **`TOOL` extracted but unused in `lifecycle-pre-tool.sh`** (`activity-hook.ts:330`) — `TOOL=$(echo "$INPUT" | grep -o ...)` runs a grep/cut pipeline but the variable is never referenced. Either pass it as `--data "$TOOL"` to enrich the event or remove the extraction line.

2. **No automated tests for `install-lifecycle-hooks`** — `activity-hook.test.mjs` has 5 solid tests for `install-activity-hook` but zero for the new command. The spec's verification is manual-only, so not a blocker, but a parallel test covering fresh-install, idempotent second-run, and existing-entry preservation would close the gap (matching the existing pattern at lines 73–169).

3. **Human-readable message goes to stderr in `install-lifecycle-hooks.ts:31`** — `console.error(...)` for the "Generated N lifecycle hook(s)…" prose is intentional (JSON on stdout, human text on stderr) but differs from `install-activity-hook` which uses `console.log` for everything. Minor inconsistency; fine to leave.

## Security & edge cases

- **Bell fires unconditionally** (`lifecycle-permission.sh`): `printf '\a'` and `osascript` alert run after `log-event --if-active … || true`, so they fire even when no insight-flow session is active. This is intentional per the spec ("urgent events") — users always need approval-pending alerts — but worth documenting if the behaviour surprises consumers.
- **Shell quoting**: session IDs and prompts are always double-quoted (`"$SESSION_ID"`) before passing to `insight-flow`. No injection risk given UUID-shaped session IDs and the `case` guard on prompt content.
- **`osascript` guard**: correctly wrapped in `command -v osascript >/dev/null 2>&1` — fails silently on Linux/Windows. ✅

## Notes

- N29 is the natural follow-on: OS notification on `log-event done` (agent tier) and deduplication with the overlapping `taskflow-skill.sh` / `taskflow-done.sh` enrichment hooks.
- The `settings.json` target (committed, project-level) vs `settings.local.json` (personal) distinction is correctly preserved — lifecycle hooks are infrastructure, activity hooks are personal.
