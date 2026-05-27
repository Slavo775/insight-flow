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


---

## Round 2

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** approved

### Summary

Full implementation of `batch-ui`, `ui-batch-register`, `ui-batch-down` is complete and correct. All 16 checklist items pass. The `ui-batch-down` change request is fully addressed with PID tracking, SIGTERM, graceful ESRCH handling, and always-clear semantics. Build passes with zero TypeScript errors.

### Checklist verification

All items verified against the diff:

- ✅ `~/.insight-flow/batch-ui.json` created on first write via `mkdirSync({ recursive: true })`
- ✅ `batch-ui --add` validates path exists, deduplicates by absolute path, writes registry
- ✅ `batch-ui --list` prints table; prints actionable "No projects registered" on empty
- ✅ Interactive multi-select using readline raw mode (↑↓ space enter, ANSI in-place render)
- ✅ `lastSelected` pre-checked on subsequent runs
- ✅ Detached `insight-flow ui --port <N>` spawn per project; `.unref()` called immediately
- ✅ `--no-open` suppresses browser; default opens all URLs after 1500 ms
- ✅ Non-TTY: `!process.stdin.isTTY` → selects all, prints notice, no prompt hang
- ✅ `insight-flow.cmd` on `win32`
- ✅ `ui-batch-register` reads and parses `taskflow.config.json`, resolves label, writes registry
- ✅ Missing config → descriptive error + exit 1 (exact message matches spec)
- ✅ Invalid JSON → SyntaxError message + exit 1
- ✅ Non-object JSON → "not a JSON object" error + exit 1
- ✅ Duplicate path → "Already registered … Nothing to do." + return (exit 0)
- ✅ `ui-batch-down` sends SIGTERM per PID, handles ESRCH, always clears `runningPids`, exits 1 on permission errors
- ✅ README "Multi-project launcher" section covers `ui-batch-register`, `batch-ui`, non-TTY mode, platform table, `ui-batch-down`

### Blockers

None.

### Non-blocking

1. **Label resolution vs. spec**: Spec step 8c specified `config.name`; `taskflow.config.json` actually uses `projectName`. Implementation correctly reads `config.name || config.projectName || basename(cwd)`, so it handles both. README accurately documents `projectName`. Net improvement over the spec.

2. **`findFreePort` recursion is unbounded**: If all ports from 6007 onward are occupied it will eventually stack-overflow. Unrealistic in practice; acceptable.

3. **`exec()` in `openUrl` not `.unref()`'d**: Browser-open command keeps the event loop alive until it completes. On macOS `open` is instantaneous; on Linux `xdg-open` may take a second. Acceptable given the 1500 ms delay already present.

4. **`--add ""` registers empty label**: `label.trim()` is applied but no guard against empty result. Trivial cosmetic issue.

### Security & edge cases

- URL passed to `openUrl` is always `http://localhost:<port>` (integer) — no injection risk.
- `process.kill(pid, "SIGTERM")` on PIDs from the registry: written only by the CLI itself during `batch-ui`, replaced on every run. A stale PID produces ESRCH which is handled.
- Registry uses `writeFileSync` (O_WRONLY|O_CREAT|O_TRUNC) — race-free for single-user CLI use.

### Notes

- `writeBatchUiRunningPids(running)` is called before the `setTimeout`, so PIDs are persisted even if the process exits before the browser-open fires. Correct ordering.
- `ui-batch-down` always clears `runningPids` regardless of failures — a second invocation is a safe no-op.
