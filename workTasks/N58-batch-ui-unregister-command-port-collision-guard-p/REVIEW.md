# N58 — batch-ui: unregister command, port-collision guard, port-in-use warning — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**PR:** https://github.com/Slavo775/insight-flow/pull/38
**Verdict:** fix-needed

## Summary

Human found one blocker during manual testing: the `insight-flow` entry in the batch-ui registry (registered at the repo root `/Users/ssedlak/Documents/personal_projects/insight-flow`) starts a server that shows playground data instead of the actual project task board. The user also noted uncertainty about which folder depth to register for a monorepo project.

## Checklist verification

- [x] `--remove` / `ui-batch-unregister` — not explicitly tested by human
- [ ] Server launched for `insight-flow` entry shows correct project data — **FAIL** (shows playground)

## Blockers

1. **Wrong workTasks shown for insight-flow entry**

   When `batch-ui` spawns `insight-flow ui --port 6007` with `cwd: /Users/ssedlak/Documents/personal_projects/insight-flow`, the dashboard opens but displays playground data rather than the actual development task board (N56, N57, N58, …).

   The repo-root `taskflow.config.json` has `workDir: "workTasks"` and `projectName: "insight-flow"`, which should be correct. The cause needs investigation — possible suspects:
   - The spawned process resolves `workDir` relative to a different base than expected
   - The `insight-flow ui` binary at port 6007 conflicts with an already-running pnpm play server at port 6006, causing the browser to load the wrong tab
   - `ui-batch-register` ran from inside a subfolder (e.g. `packages/taskflow/`) instead of the repo root, registering the wrong path

   **Human's exact words:** "i dont have a playground i have a insight flow but run playground … probably i should be in different folder like deeper in the project?"

   **Fix:** Investigate which path was registered and which `taskflow.config.json` the spawned server actually reads. Add a `batch-ui --list` output showing `workDir` + `projectName` resolved from each registered path, so users can verify they registered the right folder before launching.

## Non-blocking

None.

## Security & edge cases

None.

## Notes

- `batch-ui --list` currently only shows `label` and `path`. Showing the resolved `projectName` and `workDir` from each entry's `taskflow.config.json` would make registration errors immediately visible.
- This may warrant a follow-on task if the root cause is a display enhancement rather than a code bug.


---

## Round 2 — AI Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** approved

### Summary

Round 1 blocker was diagnosed as orphaned stale processes from a prior batch-ui run when the registry still pointed to the playground folder. Root cause was user-data (stale registration path), not a code bug. The fix from round 1 adds `batch-ui --list` config resolution, making misregistrations immediately visible. All original N58 features verified working. All quality gates pass.

### Checklist verification

- [x] `batch-ui --remove "<label>"` removes entry from registry and `lastSelected` — verified with add+remove round-trip
- [x] `--remove` unknown label → error message + exit 1 — verified
- [x] `--remove` empty label → usage hint + exit 1 — verified
- [x] `ui-batch-unregister` removes cwd entry from registry and `lastSelected` — code path confirmed; `entries.find(e.path === cwd)` + splice + lastSelected filter
- [x] `ui-batch-unregister` in unregistered folder → error + exit 1 — verified (`/tmp` → "is not registered")
- [x] `claimedPorts` set prevents same-port assignment within one run — `claimedPorts.add(port)` after each assignment; `findFreePort` checks `claimed.has(from)` before TCP probe
- [x] `findFreePort` prints `(port N was occupied, skipped)` to stderr on TCP error — confirmed in code
- [x] Already-running server prints `[<label>] server on port <N> already running, skipped` and skips spawn — `isProcessAlive` probe + `continue`
- [x] Dead PID (ESRCH) falls through to spawn — `isProcessAlive` returns `false` when `code !== "EPERM"`
- [x] `writeBatchUiRunningPids([...surviving, ...newlySpawned])` — union write confirmed in code
- [x] README documents unregister commands + already-running behaviour — both blocks present in diff
- [x] `ui-batch-unregister` and `batch-ui --remove "<label>"` in `insight-flow help` output — verified
- [x] Build clean — `pnpm --dir packages/taskflow run build` passes with zero errors
- [x] **Round 1 fix**: `batch-ui --list` shows resolved `projectName` + `workDir` from each entry's config — verified output shows `config: insight-flow / workDir: workTasks` per entry

### Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` — zero errors
- [x] `pnpm --dir packages/taskflow run build` — clean
- [x] `pnpm --dir packages/taskflow test` — 6/6 pass
- [x] `batch-ui --add`, `--list`, `ui-batch-register`, `ui-batch-down` — no regressions (existing code paths unchanged)

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

`cmdBatchUiList` catches JSON parse errors from malformed configs gracefully (shows `(invalid config)` inline). Empty `workDir` field is handled — only shown when non-empty. Both are solid.

### Notes

- Round 1 blocker root cause confirmed: orphaned server at :6007 had `cwd` set to `playground/` — artifact of a prior batch-ui run when the registry path was stale. Killed manually (`kill 26109 7002`). No code change required for the root cause itself; the `--list` config display is the correct preventative measure.
- `findFreePort` claimed-set check fires before the TCP probe for in-memory claimed ports; TCP-failure branch fires the stderr warning. Distinction is correct — no warning for self-claimed ports.
