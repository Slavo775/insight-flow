# N243 — Debug log instrumentation — error boundaries (client+server) + registration logging (master+project) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-16
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

The instrumentation is well-placed and the client→master forward path is correct (project client → own server `/log` → master with the project's token; master client → `/log` with `"master"`; both survive the hub proxy). Registration logging is tested end-to-end. **Two blockers:** the project server's `/log` route is unauthenticated + `ACAO:*` (cross-origin log injection), and the `uncaughtException` handlers suppress the crash instead of logging-then-exiting. Reviewed with correctness + security subagents.

## Checklist verification

- [x] Shared `ErrorBoundary` mounted at both client roots — pass (safe: try/catch, text-only)
- [x] Caught render error → error log sent — pass
- [x] Master uncaught handlers → `recordLog("master")` — pass (but see Blocker 2: no exit)
- [x] Project uncaught handlers → forward to master — pass (but Blocker 2 + NB-1: registered in `startServer`)
- [x] Registration logs (project start/finished, master received/generated) — pass (tested)
- [x] Client→master path — pass (verified incl. under the proxy)

## Blockers

1. **MEDIUM — cross-origin log injection: the project `/log` route has no trust gate — `dashboard/server/index.ts` (the `/log` route) + `ACAO:*` (~line 780)**
   Unlike the master's `/log` (`isTrustedLocalRequest`), the project `/log` has no origin/host check and `JSON.parse`s any body. With `Access-Control-Allow-Origin: *`, a page the victim visits can do a CORS-safe POST (`content-type: text/plain` → no preflight) to `http://localhost:6006/log` and the project forwards it to the master keyed by the project's real token. **Failure:** attacker-controlled logs falsely attributed to a project + unbounded log spam / disk churn, needing only the default port. **Fix:** gate the project `/log` like the master's (reject a cross-origin `Origin`, check `Sec-Fetch-Site`), or don't emit `ACAO:*` for it.

2. **HIGH — `uncaughtException` handlers suppress the crash — `dashboard/server/index.ts` (project handler) + `master/index.ts` (master handler)**
   Adding a `process.on("uncaughtException")` listener overrides Node's default (print + `exit(1)`). Both handlers only log and return, so after a truly uncaught throw the process keeps serving requests in an undefined/corrupted state — and the operator sees no crash (the opposite of "make crashes visible"). The project handler even contradicts its own comment ("log-then-exit … after best-effort forwarding") but never exits. **Fix:** project — forward, then exit on the next tick (`setImmediate(() => process.exit(1))`) so the async log flushes first; master — `recordLog` is synchronous, so `process.exit(1)` right after is safe. (For `unhandledRejection`, logging + staying alive is a defensible choice — decide explicitly; `uncaughtException` should not be swallowed.)

## Non-blocking

1. **Project uncaught handlers accumulate if `startServer` runs >once per process** — `dashboard/server/index.ts` (handlers inside `startServer`). The master deliberately moved its handlers to `runMaster` to avoid this; the project ones sit in `startServer`. Tests don't call `startServer` and the CLI calls it once, so no live impact — but for parity register once at module load or guard with `process.listenerCount(...) === 0`.
2. **Early-boot / standalone crashes are dropped** — `forwardLogToMaster` is a no-op until registered, so a crash before registration (or when standalone) never reaches `/logs`. Expected (no store to reach), but worth knowing.

## Security & edge cases

Security subagent: the registration token is NOT logged; uncaught handlers log message + stack (inherent). Blocker 1 is the reachable-by-a-webpage issue. `ErrorBoundary` is safe (try/catch, no HTML sink).

## Notes

- Fixes here are the higher-value ones (Blocker 1 = a real cross-origin vector; Blocker 2 = crash visibility + process safety).
- Reviewed together with N242 (fix-needed) + N244 (approved).

## Review-fix (Round 1) — 2026-07-16

- **Blocker 1 (cross-origin log injection)** — FIXED. The project `/log` route now rejects a cross-site `Sec-Fetch-Site` (browser-set, unforgeable by page JS) → a visited page's `text/plain` POST is refused; same-origin browser + server-to-server (no header) still pass.
- **Blocker 2 (uncaughtException swallowed)** — FIXED. `uncaughtException` now logs then EXITS — project: `setImmediate(() => process.exit(1))` (lets the async forward flush); master: `recordLog` (sync) then `process.exit(1)`. `unhandledRejection` deliberately stays log-and-continue (documented).
- **NB-1 (handler accumulation)** — DONE. Project handlers now install once (`serverErrorHandlersInstalled` module flag).
- **NB-2 (early-boot logs dropped)** — not actioned (expected; no store to reach pre-registration).
- **Gates:** build OK, typecheck clean, eslint 0 errors, 369/369 tests.


---

## Round 2 — re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-16
**Verdict:** approved

### Summary

Both blockers fixed correctly:
- **Cross-origin injection** — the project `/log` route now rejects a `sec-fetch-site` other than `same-origin`/`none` (browser-set, unforgeable by page JS), before parsing the body. A visited page's `text/plain` POST is refused; same-origin browser + server-to-server (no header, incl. the hub proxy forwarding a same-origin request) still pass. Correct.
- **uncaughtException** — now logs then exits: master `recordLog` (sync) + `process.exit(1)`; project forwards + `setImmediate(() => process.exit(1))` so the async log flushes first. `unhandledRejection` deliberately stays log-and-continue (documented). Project handlers install once via `serverErrorHandlersInstalled`.

No new issues. Approved.

### Blockers

None.

### Non-blocking

- Early-boot/standalone logs still dropped (NB-2) — expected, accepted.

### Notes

Ready to ship. typecheck clean, 369/369.
