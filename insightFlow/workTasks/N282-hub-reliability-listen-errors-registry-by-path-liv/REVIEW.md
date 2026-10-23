# N282 — Hub reliability — listen errors, registry by path, liveness counter, lock probe, versioned service worker — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `ca7a481` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

The delivered parts are correct: the service-worker cache name is version-stamped and only an HTML shell is cached under `/`; the master listen promise rejects with a clear message; the dashboard has a listen `error` handler and its process handlers now print to stderr; every `fs.watch` has an `error` handler; `Connection`-listed hop-by-hop tokens are stripped (and the review confirmed the strip runs on a copy **before** `x-forwarded-host` is set, so the client-controlled `Connection` value cannot remove the forwarded Host); a mid-stream throw destroys the socket and logs; register label/id are capped. The A51 registry/liveness/port/lock cluster was deliberately deferred and the reasoning holds. **One defect blocks merge:** the master **CLI** exits `0` on a busy port — the rejection is swallowed by the master's own `unhandledRejection` handler and nothing holds the event loop — so the "non-zero exit for both servers" criterion is false as ticked. One-line fix.

## Checklist verification

- [ ] Both servers handle listen errors with a message + non-zero exit; process handlers print to stderr (A50) — PARTIAL: dashboard VERIFIED (`index.ts:1843-1850`, exit 1); master message VERIFIED (`server.ts:1579`) but non-zero exit NOT MET (blocker 1); process handlers VERIFIED (`index.ts:1684`, `:1695`)
- [ ] Start order after listen (A50) — DEFERRED, tolerable (the EADDRINUSE `error` fires on nextTick, so `process.exit(1)` lands before the register fetch); but the stated reason ("deferred with the A51 cluster") is inaccurate — it is three statements moved into `onListen`, unrelated to registry code (non-blocking #2)
- [ ] Every `fs.watch` has an `error` handler that closes and re-arms (A50) — PARTIAL: handlers on all four (`index.ts:228`, `:252`, `:282`; `activity.ts:66`); "re-arms" only holds for subdir (implicit via `refreshSubdirs`) and activity (500 ms poll); the recursive and root watchers are closed for good (non-blocking #1)
- [ ] A51a registry by path — DEFERRED, justified (`registry.upsert` keyed on projectId is load-bearing across master-liveness; nothing half-done)
- [ ] A51b liveness counter — DEFERRED, justified (pairs with A51a)
- [ ] A51c port reservation — DEFERRED, justified (same boot/registry cluster)
- [ ] A51d lock by HTTP probe — DEFERRED, justified (master-boot encodes current lock semantics)
- [x] SW cache name version-stamped; `/` key only stores HTML (A23, A79) — pass (`server.ts:238`, `:265-266`, `:1487`; test). Skipping a `/hub-notify.js` bypass is defensible (non-blocking #6)
- [x] `Connection` tokens stripped; mid-stream throw destroys + logs; register caps (A52) — pass (`:379-385`, `:1556-1564`, `:914`, `:916`). Remainder (`/update` zod, version-fetch dedupe, HTML cap) DEFERRED, justified. Register-url validation skipped; the "single enforcement point" claim checks out (non-blocking #8)
- [x] Quality gates — as run by the implementer (413/413 then); not re-run here
- [ ] Verification tests — PARTIAL: busy-port rejection + SW assertions exist (`test/hub-reliability.test.mjs`); no test that `Connection: x-foo` is not forwarded (spec step 10); the new test covers only the in-process rejection, not the CLI exit code (blocker 1)
- [ ] Manual checks — both unticked, honest

## Blockers

1. **The master CLI exits 0 on a busy port** — `src/master/index.ts:71`.
   **Why:** `startMasterServer` (`server.ts:1577-1583`) prints the message and rejects → `runMaster` rejects → `cli.ts:490-499` re-throws inside `.catch` → that rejection is swallowed by the `process.on("unhandledRejection")` handler the master installed at `index.ts:45` (it only `recordLog`s, never exits) → nothing holds the event loop (no timers before listen; the server never bound) → the process exits **0**. Scenario: `insight-flow master --port 6100` with the port held by another process prints "[hub] port 6100 is already in use" and returns success — a script or the hub auto-start cannot tell it failed.
   **Fix (one line; the message is already printed):** `const { close } = await startMasterServer(config).catch((): never => process.exit(1));` at `index.ts:71` (or `process.exitCode = 1` before the rethrow at `cli.ts:499`). Add a CLI-level assertion (spawn `master` on a busy port → exit code ≠ 0) so the checklist line is true as written.

## Non-blocking

1. `src/dashboard/server/index.ts:228-235` and `:252-259` — the recursive (macOS/win) and root watchers are closed on `error` and never re-created, and the work dir has no polling fallback, so after an EMFILE/ENOSPC the live file-change SSE stops silently until restart. Suggested: a one-shot `setTimeout(() => { try { …recreate… } catch {} }, 5000)` in the two handlers, or at least say "restart the dashboard to resume live updates" in the `console.error`.
2. Start-order deferral (A50) — fix the reasoning text in the checklist: it is not coupled to registry code; it is moving `activity.start()` (`:801`), the seed loop (`:811-818`) and `setupMasterIntegration` (`:824-826`) into `onListen` (`:1803`). Residual damage after this diff is small (the synchronous `activity.start()` rewrite at `activity.ts:45` can still blind the first instance's `readNewLines` when the log exceeded `maxEvents`).
3. `src/master/server.ts:1577` — the `once("error")` stays attached after a successful listen. Post-listen server `error` events exist (`net.js onconnection` emits on accept EMFILE/ENFILE): the first is swallowed (prints + no-op reject on a settled promise), the second is unhandled → `uncaughtException` → exit 1. Not a regression, but hardening: remove the once-handler in the listen callback and attach `server.on("error", e => console.error("[hub] server error:", e.message))`.
4. `src/dashboard/server/index.ts:1843-1850` — `server.on("error") → exit(1)` also fires for post-listen accept errors; outcome identical to before, loopback-bound, not a remote DoS (client resets go to `clientError`). Hardening: `if (!server.listening) process.exit(1); else console.error(...)`.
5. `src/master/server.ts:1487` — `"if-hub-" + currentVersion()` is passed as `String.replace`'s replacement string (`$&`, `$'` patterns are interpreted) and dropped into a single-quoted JS literal unquoted. Trust level is the shipped `package.json`, so not exploitable; cheap: gate with the existing `SEMVER_RE` (`:652`) falling back to `"0.0.0"`, or use a replacer function. Reading `package.json` per `/sw.js` request is fine (rare, try/catch'd); a module-level const would do.
6. SW static branch (`:272-280`) is cache-first for `/hub-notify.js` although the route sends `Cache-Control: no-cache` (`:1499`): within one version (yalc/dev pushes) a changed notifier stays stale until the cache name changes. Documented and defended in the checklist; acceptable for the release model. Optional: network-first with cache fallback for that one path (~3 lines).
7. `src/dashboard/server/activity.ts:66-73` — the handler closes `this.watcher` instead of the captured instance; harmless because `start()` is called once, but `const w = watch(...); w.on("error", () => w.close())` is the safer form.
8. `/api/register` `url` not validated (spec step 9). The "single enforcement point" claim checks out (proxy origin pin + `isLoopbackHost`, health probe `:726`, liveness sweep `:1358`; `/start` returns url but the client ignores it; `toPublicView` omits url) — OK as-is; a one-line reject would still be cheaper to reason about.
9. `insightFlow/workTasks/tasks-N280-N289.json` — N286 `flowId` key moved (cosmetic reorder from the CLI write), harmless.

## Security & edge cases

- Verified: `stripHopByHop` runs on a **copy** first (`:506`), `x-forwarded-host` is set **after** from the original `req.headers.host` (`:509`), then `host` is deleted (`:510`) — so `Connection: x-forwarded-host` only removes a client-supplied forged value (an improvement), and `Connection: host`/`accept-encoding` name headers the proxy deletes anyway. Browsers cannot set `Connection` (forbidden header); a non-browser loopback client could simply omit headers. No request smuggling: Node re-frames the upstream request and `transfer-encoding` is in the fixed set. Response-side strip deletes nothing important. `__IF_CACHE__` replaced exactly once (string pattern = first only); `activate` prunes every key ≠ CACHE so the old `if-hub-v3` is deleted; the navigate branch is same-origin only so never opaque, `res.headers` is always a `Headers`, and the only other `text/html` responses (502/404/504) are not `ok` so cannot poison `/`. The catch-all's `recordLog` cannot throw (`safeParse` + fully try/catch'd `appendLog`) and `res.destroy()` is safe on a destroyed socket; `err.message` may carry local fs paths the hub already logs — no tokens. Register caps stay consistent (the dashboard uses the returned id). The test port range 6300–6499 overlaps no other file (sequential run anyway). Messages use the right port variables.

## Notes

- Fix order: blocker 1 (one line + a CLI exit-code assertion) → correct the two checklist wordings (start-order reasoning; "re-arms") → #1 (re-arm the recursive/root watchers) and #3/#4 (post-listen `error` handling) are the useful hardening follow-ups.
- The A51 cluster (registry reconcile-by-path + shared token, liveness counter, port reservation, lock HTTP-probe) remains the untracked medium-severity remainder of this task — it needs its own task, as the checklist recommends.
- Hand-off: `/task-review-fix N282` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — master CLI exits 0 on a busy port — FIXED** (`master/index.ts`): `const { close } = await startMasterServer(config).catch((): never => process.exit(1));` — the bind-failure reason is already printed; now the CLI exits non-zero instead of letting the `unhandledRejection` handler swallow it and falling through to exit 0. New test `A50 (CLI, blocker 1): master on a busy port exits non-zero, does not hang`.

**Non-blocking addressed:**
- #1 the recursive/root dashboard watchers (no polling fallback) now log "— restart the dashboard to resume live updates" on error, so live-update loss isn't silent.
- #2 corrected the two inaccurate CHECKLIST wordings (start-order is a small `onListen` move, not coupled to the A51 cluster; "re-arms" only holds for the subdir/activity watchers).
- #3 the master listen handler swaps the bind-time `once("error")` reject for a persistent `on("error")` logger once bound, so a post-listen accept error is logged, not an uncaughtException.
- #4 the dashboard `server.on("error")` now exits only on a BIND failure (`!server.listening`); a post-listen accept error is logged.
- #5 the `/sw.js` cache-name substitution uses a replacer FUNCTION, so a `$`-pattern in the version is never interpreted.
- #7 the activity-engine watcher error handler closes the captured instance and clears the field only if it still points at that watcher.

**Non-blocking deliberately left (with reason):**
- #6 the SW static branch is cache-first for `/hub-notify.js` despite `no-cache` — documented/accepted for the release model (a version bump invalidates it).
- #8 `/api/register` url not validated — a register-time loopback reject would break LAN mode; the proxy origin-pin + `isLoopbackHost` is the real enforcement point (review agreed "OK as-is").
- #9 the `tasks-N280-N289.json` flowId key reorder — cosmetic CLI write.

**Still outstanding (needs its own task, as the checklist recommends):** the A51 cluster — registry reconcile-by-path + shared-token, per-id liveness counter, port reservation for in-flight starts, lock-by-HTTP-probe. These are an invasive registry/boot refactor (20+ master-liveness tests depend on the current `registry.upsert` keyed on projectId) and were out of scope for this fix pass.

Verified: typecheck + lint + build clean; hub-reliability 3/3, and dashboard/activity/smoke/trust 43/43.
