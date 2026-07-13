# N219 — Hub reverse-registration handshake + client token privacy — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**PR:** (no PR yet — branch `feat/N219-hub-reverse-registration-handshake`)
**Verdict:** fix-needed

## Summary

Token privacy (goal 1) is **fully and correctly implemented** — the per-project `token` (and server-only `url`/`path`) is gone from every client-reachable surface, verified by two independent passes and a hermetic test. The reverse-registration handshake (goal 2) works end-to-end. However, the **new `POST /hub/reregister` endpoint introduces a real DoS + CSRF + proxy-bypass surface**, and repeated re-registration **leaks liveness connections** on both the project and the master. These are regressions in the exact subsystem this task reworks, so: REQUEST CHANGES. Risk: medium (token-privacy security goal met; new control-plane endpoint under-hardened).

## Checklist verification

- [x] `toPublicView` + `getAllPublic` return only `{id, projectId, label, online, lastSeenAt, state}` — pass (`registry.ts`)
- [x] `markUp` removed — pass (no dangling callers)
- [x] `GET /api/hub/projects` public projection — pass (`server.ts:633`)
- [x] `getOverviewHtml` fed public projection — pass (`server.ts:826`, `overview.ts` typed on `PublicProjectEntry`)
- [x] Every `broadcast("project-update", …)` public — pass (all 6 sites use `toPublicView`; refresh loop uses `getAllPublic`)
- [x] Proxy still resolves real `url` server-side — pass (`server.ts:386`; `/p/insight-flow/` → 200 live)
- [x] Project exposes localhost-only `POST /hub/reregister`; declines when standalone — pass (functionally), but see Blockers 1 & 2 for the gate's soundness
- [x] Master boot POSTs `/hub/reregister` per project (replaces `markUp`); no response → nothing — pass (`master/index.ts`)
- [x] typecheck / eslint / tests (339) — pass

## Blockers

1. **DoS — `/hub/reregister` leaks a liveness connection per call, unthrottled.**
   `dashboard/server/index.ts` (`/hub/reregister` → `void masterReregister()`, ~line 667) → `reregister` closure (~542) → `holdLiveness` (384–428).
   **Why:** `reregister()` has no in-flight guard and no throttle. Each call runs `registerWithMaster` then calls `holdLiveness(...)` again, opening a **new** persistent `GET /api/hub/live` SSE to the master **without closing the previous one** — `holdLiveness` only guards *reconnection* (`if (masterToken !== token) return`, lines 392/398); it never aborts the currently-open `httpGet(liveUrl)` (line 406). And because `registry.upsert` returns the **existing** token for a reconciled entry (`registry.ts:47`), `masterToken` is unchanged across repeated calls, so the old loop is **never superseded** — every call adds one more open socket on the project side and one more `/api/hub/live` connection + 25 s heartbeat interval on the master side (`server.ts:659–665`), plus a burst of `project-update` broadcasts. Hammering the endpoint → socket/timer exhaustion on both processes. (The inline comment "mints a fresh token" is inaccurate for the reconcile path.)
   **Fix:** (a) single-flight + short throttle on `reregister` — ignore/await if a register is already in-flight or ran within the last few seconds; and (b) in `holdLiveness`, abort/destroy the prior open request before opening a new one (track the active `req`).

2. **CSRF + proxy-bypass of the loopback gate on `/hub/reregister`.**
   `dashboard/server/index.ts` (route ~655) and `master/server.ts` proxy (382–425).
   **Why (CSRF):** the route is a POST needing no body and no custom header → a CORS "simple request" (no preflight). Any web page the user has open can `fetch("http://localhost:<port>/hub/reregister", {method:"POST"})`; the browser connects from loopback so `req.socket.remoteAddress` passes the gate and the side effect runs (attacker can't read the response, but the effect executes). **Why (proxy-bypass):** the master's reverse proxy (`/^\/p\/([^/]+)(\/.*)?$/`) forwards `/p/<projectId>/hub/reregister` to the project's `http://localhost:<port>/hub/reregister` with method + body preserved; the project then sees `remoteAddress = 127.0.0.1` (the master's own socket), so the loopback gate passes. Since the master binds all interfaces, a **LAN peer** can `POST http://<master-ip>:6100/p/<projectId>/hub/reregister` (projectId is public via `/api/hub/projects`) and defeat the loopback-only intent. Combined with Blocker 1 this is a remote/CSRF DoS.
   **Fix:** (a) reject cross-site browser calls — e.g. require `Sec-Fetch-Site: same-origin`/`none` or an absent/same-origin `Origin` header (the master's server-to-server Node `fetch` sends neither, so the boot handshake still works); and (b) make the master proxy **not forward** control-plane paths — refuse to proxy `rest` starting with `/hub/` (these are project↔master, never for the browser).

## Non-blocking

1. `dashboard/server/index.ts` reregister comment says "mints a fresh token" — inaccurate on the reconcile path (`upsert` returns the existing token). Fix the comment when addressing Blocker 1.
2. **Accepted trade-off (not a defect):** removing `markUp` means a dashboard old enough to lack both `/hub/reregister` and the liveness-401 re-register path will no longer show online after a master restart. This matches the task's "never fabricate online state" intent; noting it as a behavior change.

## Security & edge cases

- **Token privacy: verified clean.** All three client sinks use the projection; the only remaining full-entry uses are server-side (proxy `url`, refresh `/health?token=` probe). `/events` sends no full-entry snapshot; `/api/activity/:id` returns only `{project, events}`. The new hermetic test asserts token/url/path absence across the hub API, SSR page data, and an SSE frame.
- **SSRF from the boot handshake: no issue.** `handshakeRegistered` POSTs `http://localhost:${p.port}/...` where `p.port` comes from the local persisted hub registry, not network input; host is hardcoded loopback.
- The `/hub/reregister` loopback gate uses the same `req.socket.remoteAddress` allowlist as the existing gates (`/api/register`, `/api/projects/create`, `start`) — sound in isolation; the weakness is that this one is reachable via the proxy (Blocker 2).

## Notes

- Correctness + security sub-reviews both independently flagged the connection-leak (correctness "duplicate liveness connection" == security "finding 3"); all cited claims were re-verified against the source before this verdict.
- The handshake trigger lives in `runMaster` (persistent server + lock), not unit-testable in the `startMasterServer` harness — verified live instead; acceptable.
- Next: `/task-review-fix` to address Blockers 1 & 2 (both localized to `dashboard/server/index.ts` reregister/`holdLiveness` + the `master/server.ts` proxy guard), then re-review.

---

## Fixes applied (task-review-fix, 2026-07-11)

**Blocker 1 — DoS / liveness-connection leak → FIXED** (`dashboard/server/index.ts`).
- `reregister` is now **single-flight + throttled**: concurrent callers share one in-flight registration, and a success within a 5s cooldown short-circuits to `true` (token already fresh + a live loop exists) — so repeated `/hub/reregister` no longer spawns a register + connection per call.
- `holdLiveness` now guarantees **one** open `/api/hub/live` connection: each call claims a new `livenessEpoch`, destroys the prior `activeLivenessReq`, and superseded loops (older epoch) stop instead of reconnecting. Epoch-keyed because a reconciled re-register returns the *same* token, so token equality alone couldn't supersede.
- Fixed the inaccurate "mints a fresh token" comment (non-blocking #1).
- Verified live: hammering `/hub/reregister` ×20 left the project→master connection count at **1** (was 3 before), project still `online=True`.

**Blocker 2 — CSRF + proxy-bypass → FIXED** (`dashboard/server/index.ts` route + `master/server.ts` proxy).
- The `/hub/reregister` route now rejects any request carrying browser fetch-metadata: an `Origin` header, or `Sec-Fetch-Site` other than `none` → `403`. The master's server-to-server Node fetch sends neither, so the real handshake is unaffected. Verified live: plain POST → `{ok:true}`; `Origin` → 403; `Sec-Fetch-Site: cross-site` → 403.
- The master proxy now refuses to forward `/p/<id>/hub/*` control-plane paths → `404`. Verified live: `/p/insight-flow/hub/reregister` → 404. Hermetic test added (`master-liveness.test.mjs`).

**Gates:** typecheck clean, eslint clean, `npm test` → **340** pass (+1 proxy-guard test). Token privacy re-confirmed (`has_token=False`).

Note: Blockers 1 & 2a live on the project dashboard (`startServer`), which the `startMasterServer` test harness doesn't boot, so they were verified live rather than by hermetic unit test; the proxy `/hub/*` guard (2b) has a hermetic test.

**Verdict after fixes:** ready for re-review.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

All three Round-1 blockers are genuinely fixed and re-verified (live + a new hermetic test). Token privacy remains intact. One **narrow, self-healing** edge case surfaced in the new re-register throttle — non-blocking. APPROVE.

### Checklist verification

- [x] Blocker 1 (leak) resolved — `holdLiveness` now epoch-supersedes older loops and destroys the prior `activeLivenessReq` (index.ts:396–405, 440), so exactly one `/api/hub/live` is ever open; `reregister` is single-flight (index.ts:573–600). Live: hammering `/hub/reregister` ×20 → project→master connections **3 → 1**, project still `online=True`.
- [x] Blocker 2a (CSRF) resolved — `/hub/reregister` rejects `Origin` or `Sec-Fetch-Site !== none` → 403 (index.ts:717–721). Live: plain POST → `{ok:true}`; `Origin` → 403; `Sec-Fetch-Site: cross-site` → 403.
- [x] Blocker 2b (proxy-bypass) resolved — master proxy 404s `/p/<id>/hub/*` (server.ts:392). Live: `/p/insight-flow/hub/reregister` → 404. Hermetic test added.
- [x] Token privacy still clean — `has_token=False` on `/api/hub/projects` after the fixes.
- [x] Gates: typecheck clean, eslint clean, `npm test` → **340** pass (+1 proxy-guard test).

### Blockers

None — all Round-1 blockers resolved.

### Non-blocking

1. **Re-register cooldown can briefly strand a project offline after a *rapid double* master restart (within `REREGISTER_COOLDOWN_MS`, 5s).** `dashboard/server/index.ts:578` — the cooldown short-circuits `reregister()` to `true` *without* establishing a new liveness loop. Normal single-restart is fine (the handshake/401 race is exactly what the cooldown should collapse, and `L1` from the first re-register stays alive). But if the sole active loop itself dies within the 5s window (a 2nd restart), its 401 handler calls `reregister()` → gets `true` → `if (!ok) reconnect()` is skipped → the loop ends with **no** replacement loop, so the project shows offline until the next re-register trigger. Self-heals on the next `pushOnChange` 401 (any task-file change) or a later master restart once the cooldown expires. Suggested hardening: gate the cooldown short-circuit on an actually-healthy connection (e.g. a `livenessConnected` flag set on the 200 / cleared on close), so it only short-circuits when a live loop truly exists.

### Security & edge cases

- Re-verified: token absent from `/api/hub/projects`, SSR page data, and SSE frames; server-side full-entry uses (proxy `url`, refresh `/health?token=`) unchanged.
- The CSRF gate correctly distinguishes browser calls (send `Origin`/`Sec-Fetch-Site`) from the master's server-to-server Node `fetch` (sends neither) — verified live that the real handshake still succeeds.
- Proxy `/hub/*` block returns a generic 404 (doesn't reveal the control-plane route); does not over-block (the project dashboard has no browser `/hub` routes).

### Notes

- The non-blocking cooldown edge is narrow (double-restart within 5s) and self-heals; recorded as a follow-up hardening rather than a blocker, per "don't gold-plate non-critical paths."
- Blockers 1 & 2a are project-side (`startServer`, not in the `startMasterServer` harness) → verified live; 2b has a hermetic test.
- Next (gated): human review, then `/task-git`.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-11
**Verdict:** approved

### Notes

> approved merge into base branch

Approved. Merge into the base branch (`dashboard-improvements`). The non-blocking re-register cooldown edge (Round 2) was not raised as a blocker.
