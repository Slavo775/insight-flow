# N151 — dashboard server request error boundary + oversize-body 413 — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Clean structural fix: the handler is extracted to `dispatch()` and `createServer` wraps it in a try/catch (500) — verified there's exactly one server (index.ts:1160) and `server.listen` is intact (1247). `/api/task-flow`'s `loadMaster` is now guarded, and both `flow-install` + `task-flow` oversize paths return 413 with the `aborted` flag (matching `/log/events`). A real regression test proves a malformed `master.json` yields 500 and the server survives. **But one async body callback the task explicitly scoped — `/log/events` — is still partly unguarded**, so the "throw anywhere in an async callback returns 500" goal isn't fully met. One blocker.

## Checklist verification

- [x] Handler-wide try/catch → 500 (headers-not-sent guarded) — pass
- [x] `/api/task-flow` async callback (loadMaster) guarded → 500 — pass (+ regression test)
- [x] `/api/task-flow` + `flow-install` oversize → 413 (aborted flag) — pass
- [x] Shared dispatch extraction; happy paths unchanged; no `uncaughtException` backstop — pass
- [~] **All async `req.on("end")` callbacks guarded** — **partial** → Blocker 1 (`/log/events`)

## Blockers

1. **`/log/events` async callback is unguarded past `JSON.parse` (index.ts:982–1008+).** The end callback try/catches only `JSON.parse`; after validation it calls `eventStore.insert(event)` (disk write, line 1008) and the master-forward — **outside any try/catch**. A throw there (disk error, corrupt events file, downstream failure) runs in a later tick, so the new handler-wide boundary can't catch it → the long-running dashboard still crashes. `/log/events` is the **highest-traffic** body endpoint (hooks POST continuously), and the task scope explicitly named "any other body-reading endpoint." So this is in-scope and missed.
   - **Fix:** wrap the post-parse body of the `/log/events` end callback in try/catch → 500 (mirror the `/api/task-flow` guard just added). ~5 lines. Consider extending the regression test with a `/log/events` throw case.
   - **✅ Resolved (fix round 1):** wrapped the `/log/events` post-parse block (`eventStore.insert` + emits + master push, `index.ts:1007–1028`) in try/catch → 500 with the `!res.headersSent` guard, mirroring the `/api/task-flow` guard. All three async body callbacks (flow-install, task-flow, /log/events) are now guarded. Gates green: 254 tests (incl. the malformed-master regression test), typecheck + format clean. A `/log/events`-specific throw test was not added — reliably forcing an `eventStore.insert` failure is flaky; the guard is a direct mirror of the test-covered `task-flow` pattern.

## Non-blocking

1. The two new 413 paths + the existing `/log/events` 413 now repeat the same `aborted`+writeHead block 3×; a shared `readBody` helper (custom-defs already has one) would DRY them. Optional.

## Security & edge cases

- Outer boundary correctly guards `!res.headersSent` before writing 500 — no double-response on a mid-write throw.
- SSE handoff (`transport.handleRequest`) returns before the guarded region owns the response — unaffected.

## Notes

The structural change is sound and the headline crash (malformed master via task-flow) is fixed + tested. Just close the `/log/events` async gap to fully meet the boundary goal. Re-review after.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Re-review of the Round 1 blocker fix. The `/log/events` post-parse block is now wrapped in try/catch → 500. Verified all three async body callbacks are guarded (`req.on("end")` at 745 flow-install, 905 task-flow, 982 /log/events — each `if(aborted) return;` then `try {`). The handler-wide boundary goal is now fully met. Approving.

### Checklist verification

- [x] All async `req.on("end")` callbacks guarded → 500 (the Round 1 gap closed) — pass
- [x] `!res.headersSent` guard on the new 500 path — pass
- [x] Gates: 254 tests (incl. malformed-master regression), typecheck clean, drift guard byte-identical — pass

### Blockers

None — Round 1 blocker resolved.

### Non-blocking

1. (Carried) The 3 oversize 413 blocks + parse handling could DRY into a shared `readBody` helper (custom-defs has one). Deliberately deferred — refactoring 3 working endpoints on a reliability fix isn't worth the regression risk. Optional future cleanup.
2. No `/log/events`-specific throw test (flaky to force an `eventStore.insert` failure); the guard mirrors the test-covered `task-flow` pattern. Acceptable.

### Security & edge cases

- Post-parse 500 path guards `!res.headersSent` — consistent with the other callbacks; no double-response.

### Notes

Reliability fix complete: malformed/missing master.json and any async-callback throw now return 500 instead of crashing the long-running dashboard. Round N151–N156 ready to move forward.


---

## Round 3 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the review-follow-ups round (N151–N156) and authorized commit + push + PR + merge via gh.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "please done commit push create PR and merge it via gh"
