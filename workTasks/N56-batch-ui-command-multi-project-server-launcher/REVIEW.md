# N56 — batch-ui command — multi-project server launcher — Review

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-05-27

### Changes requested

- **Addition** — Add `insight-flow ui-batch-down` command to stop all batch-spawned servers. User's exact wording: "can we have also some ui-batch-down to down all servers?"

### Notes

- The N56 spec Notes already flags this as a future `--kill` sub-command ("would need PID tracking in global config"). The human is now explicitly requesting it as part of this feature.
- Implementation will require persisting spawned-process PIDs in `~/.insight-flow/batch-ui.json` (e.g. as a `runningPids` array) so `ui-batch-down` can locate and `kill` them.
- Must handle: processes already exited (no-op), processes not in registry (skip), partial-down (kill as many as possible and report failures).
