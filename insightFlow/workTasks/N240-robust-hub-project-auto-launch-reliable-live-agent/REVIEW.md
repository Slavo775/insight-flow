# N240 — Robust hub project auto-launch + reliable live agent-status to master (notifications fire) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-15
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Small, well-targeted 2-file fix. Phase 1 (the confirmed hub crash) is correct and the root-cause reasoning is right: `spawn` with a missing `cwd` emits an **async** `error` the try/catch can't catch, so the guard + `child.on("error")` are the correct fix, backed by a passing integration test. Phase 2 (the reregister status-push gap) is a genuine bug found by reading, and the fix is correct (fresh credentials, mirrors the working initial push, no decay-tick hazard). **One low-severity ordering nit** in Phase 1 introduces a minor regression that should be tidied before merge; otherwise the code is sound. Build + typecheck + 363/363 tests green.

## Checklist verification

- [x] `existsSync` guard on the `/start` spawn path — pass (but placement, see Blocker 1)
- [x] `child.on("error")` prevents async-spawn crash — pass (verified sufficient: unref keeps the listener; non-zero exit is `exit`/`close`, not `error`)
- [x] Stale entries ignored (missing-path `/start` → 404, no auto-prune) — pass
- [x] Phase 1 integration test (missing-path `/start` → 404, master stays up) — pass
- [x] Phase 2 root cause identified + fixed (reregister now `pushStatusToMaster`) — pass (code); **verification incomplete** (NB-1)
- [ ] Phase 2 live end-to-end smoke (real `active→done` fires a banner) — **not done** (deploy + real transition needed; NB-1)

## Blockers

1. **LOW — `existsSync` guard is placed before the already-running early-return — `packages/taskflow/src/master/server.ts:1355`**
   The guard sits ahead of `if (entry.online && entry.url)` (line 1361), but it only needs to protect the *spawn*. `online` comes from the liveness signal, not the folder, so a project that is genuinely running keeps its old cwd even if the folder is transiently gone (deleted/renamed/unmounted network share). **Failure:** a running, registered project whose folder disappears → `POST /start` returns `404 "project path no longer exists"` instead of routing to the live `entry.url` — a small regression this diff introduces (pre-N240 it returned the running URL).
   **Fix:** move the `existsSync(entry.path)` guard to just before the `spawn` — i.e. after both the `entry.online && entry.url` (1361) and `startingProjects.has` (1368) early-returns. The guard belongs directly in front of the code path it protects.

## Non-blocking

1. **Phase 2 is not live-verified and has no automated test.** The reregister status-push is correct by reading and mirrors the working initial-register push, but "does a real `active → done` fire a banner" was not exercised (needs the build deployed + a real agent turn), and the internal reregister path has no unit test. Accepted given the difficulty, but flag for a **live smoke after this ships in a release** (the actual confirmation the user's notifications now fire). Consider a small integration test driving `POST /hub/reregister` on a dashboard + asserting the master's `claudeStatus` gets set, if cheap.
2. **Optional diagnostic (deferred, from the spec):** a per-project `claudeStatus` + last-push-time view would make "why no notification" answerable without a code trace. Not required.

## Security & edge cases

No security concerns. `existsSync` is on a registry-supplied path already gated by `isTrustedActionRequest` (loopback/allowlisted). Async spawn-error handling verified complete (no remaining unhandled path: sync throws hit the outer try/catch + `finally` cleanup; `exit`/`close` don't crash the parent).

## Notes

- Root causes both confirmed (Phase 1 reproduced live earlier; Phase 2 by reading the initial-register vs reregister asymmetry). See `ANALYSIS.md`.
- Related: N238 (the notifier + engine, correct and untouched here), N220/N228 (project start + self-heal — the touched handler).
- Blocker 1 is a 1-move fix; recommend applying it, then this is ready. The live smoke (NB-1) is the real end-to-end proof and belongs to the release that ships this.

## Review-fix (Round 1) — 2026-07-15

- **Blocker 1 (existsSync ordering)** — FIXED. Moved the `existsSync(entry.path)` guard to after the `entry.online && entry.url` and `startingProjects.has` early-returns, immediately before `startingProjects.add` / the spawn (`master/server.ts`). A live project now routes to its running `url` before the folder check; only the spawn path is gated. The Phase-1 test still passes (the test project is offline → falls through to the guard → 404).
- **Gates:** `pnpm build` OK, typecheck clean, eslint 0 errors, **363/363** tests (the one intermittent fail was the known-flaky `master-boot` port collision — passes in isolation and on re-run; unrelated to this change).
- **NB-1 (Phase 2 live smoke)** — not actioned; it belongs to the release that ships this (deploy + real agent turn).


---

## Round 2 — re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-15
**Verdict:** approved

### Summary

Blocker 1 is resolved correctly. Verified the new order in `master/server.ts`: `entry.online && entry.url` (1352) → `startingProjects.has` (1359) → `existsSync` guard (1370) → `startingProjects.add` (1375) → `spawn` (1383). The guard now gates only the spawn path — a live project routes to its running `url` before any folder check, and the 404 returns before `startingProjects.add` (no add/delete needed). No new issues. Approved.

### Checklist verification

- [x] Blocker 1 (existsSync ordering) — FIXED; guard is now after the already-running / starting early-returns
- [x] Phase 1 crash guard + `child.on("error")` — unchanged, still correct
- [x] Phase 2 reregister status-push — unchanged, correct
- [x] Master tests 26/26 (incl. the N240 missing-path `/start` → 404 test), typecheck clean

### Blockers

None.

### Non-blocking

1. **Phase 2 live smoke still pending** (carried from Round 1) — the reregister status-push is correct by reading but not exercised end-to-end. Do a real `active → done` → banner check **after this ships in a release**. Not required for approval.

### Security & edge cases

No change from Round 1; no concerns.

### Notes

- Ready to ship. Recommend rolling into the next release (e.g. 2.9.0), where the Phase 2 live smoke can finally be run against the deployed build.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-15
**Verdict:** approved

### Summary

Human's exact words: "approved please commit push create pr and create merge request please"

### Blockers

None.

### Suggestions (non-blocking)

None raised by the human. (AI-review NB-1 — Phase 2 live smoke — remains open, to be run against the deployed build after this ships.)

### Notes

Approved to ship. Human requested commit + push + PR — handing to `/task-git`. Not merging (leaving that for the release flow).
