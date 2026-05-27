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
