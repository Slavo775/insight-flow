# N215 — Master single-origin app shell: project switcher + reverse-proxy /p/<id> + start-and-go — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** fix-needed

## Summary

Delivers the single-origin hub: `base.ts` + `apiFetch`/`apiUrl` make the client base-aware (all 18 `api.ts` fetches + both `EventSource("/sse")`), the overview becomes the switcher (online-first, on-demand refresh, Open→`/p/<id>/`, Start-and-go), a loopback-only `/api/hub/projects/:id/start` spawns via the master's own `cli.js`, `/` serves the shell, and a floating "⌂ Hub" link is injected into proxied dashboards. Well scoped (server-rendered shell per the user's decision), 335/335. **One (small) blocker:** the base-awareness — the *critical* deliverable — misses the `/sounds/` path, so sounds break under the proxy.

## Checklist verification

- [x] Shell served at `/` and `/overview` — verified (200 + switcher elements).
- [x] Switcher online-first + Refresh + refresh-on-load (`/api/hub/refresh`) — verified.
- [x] Open online → `/p/<id>/` same tab; Start-and-go for offline — code + test.
- [x] `/api/hub/projects/:id/start` spawns (own `cli.js`, loopback-only) + waits reachable; 400 on unknown — tested.
- [x] Client base-aware for `/api` + `/sse` — verified (`__IF_BASE__` bundled; 0 bare `fetch` in api.ts).
- [ ] **Base-awareness complete** — misses `/sounds/` (Blocker 1).

## Blockers

1. **Base-awareness is incomplete: `/sounds/` is still absolute → proxied sounds break.**
   - **Where:** `packages/taskflow/src/dashboard/client/notifications.ts:80` — `const src = state === "idle" ? "/sounds/idle-ping.mp3" : "/sounds/permission-alert.mp3";` then `fetch(src, {method:"HEAD"})` (line 81) and `new Audio(src)` (line 86).
   - **Why:** Pass 1's stated goal was to make the client base-aware so it works under `/p/<id>/`. These absolute `/sounds/…` URLs ignore the runtime base and hit the **master root**, which doesn't serve them — so the HEAD 404s and no sound plays in a proxied dashboard. Same class as the `/api`,`/sse` calls that *were* wrapped; this one was missed.
   - **Fix:** wrap with the base helper — `import { apiUrl } from "./base.js"` and use `apiUrl(src)` for both the `fetch` and `new Audio`. Re-verify a proxied dashboard resolves `/p/<id>/sounds/…`.

## Non-blocking

1. **Systemic (recurring): `/api/register` is unauthenticated + the master binds all interfaces.** The local overview therefore lists LAN-registered projects, and clicking **Start** spawns `insight-flow ui` with `cwd = entry.path` (a registrant-supplied dir). Impact is bounded — fixed args, no shell, `ui` doesn't exec config — but it's a mild social-engineering surface, and the same root cause behind the N212/N214 SSRF fixes. Worth a dedicated hardening task: gate `register` to loopback and/or bind the master to `127.0.0.1`.
2. **Start `alreadyRunning` false-positive.** `waitReachable(projectUrl, 400)` can't distinguish this project from any other service occupying the assigned port; a match makes the client route to `/p/<id>/`, which then proxies to an empty `entry.url` → 502. Rare; consider probing `/health` or checking `entry.online` instead.
3. **Start → navigate race.** The client routes to `/p/<id>/` as soon as the server is *reachable*, but the proxy needs `entry.url`, which is set only when the spawned dashboard *registers*. Small window; could wait for the entry to gain a url (or online) before returning.
4. **Switcher onclick uses a raw id in a JS-string context** (`startProject('` + p.id + `')`). Safe today (ids are registry UUIDs), but not escaped for that context; a guard/escape would harden it against a future non-UUID id.
5. **No unit test for the base logic.** `base.ts`/`apiUrl` is the critical enabler; a small pure-function test (given `__IF_BASE__` → prefixed url) would lock it. Verified only via the bundled-string check + suite.

## Security & edge cases

- `start` is loopback-only (403 otherwise), spawns with fixed args + no shell → no command injection; a bad `cwd` just throws (500). Good.
- Base-path math is correct: standalone `BASE=""`, proxied `BASE="/p/<id>"`.
- The proxy HTML injection (base hook + Hub link) uses static strings / escaped values.

## Notes

- **Roadmap Phase 3** — the visible payoff, on `dashboard-improvements`. Unblocks N216 (SW notifications) / N217 (PWA).
- Scope decision (user-approved): server-rendered shell, not a second React+Vite app. Documented in the checklist.
- Gates: build ✅ · 335/335 ✅ · typecheck ✅. The blocker is a 1–2 line completion of Pass 1.

---

## Fix (2026-07-11, task-review-fix) — all issues

- **Blocker 1 — resolved.** `notifications.ts` sound `src` now goes through `apiUrl(...)` (base-aware), so both the HEAD `fetch` and `new Audio` resolve under `/p/<id>/sounds/…`. Completes Pass 1's base-awareness.
- **Non-blocking 1 (systemic) — resolved directly.** `POST /api/register` is now **loopback-only** (`403` for non-loopback). Dashboards always register from localhost, so this is transparent — and it closes the root cause behind the N212/N214 SSRF guards *and* the N215 start-cwd surface (a LAN peer can no longer inject a registrant-controlled url/path). The proxy/probe loopback guards remain as defense-in-depth. **No separate hardening task needed.**
- **Non-blocking 2 — resolved.** Start's "already running" check now uses the authoritative `entry.online && entry.url` (liveness) instead of a naive port probe.
- **Non-blocking 3 — resolved.** After spawn + reachable, start now waits (≤5s) for the spawned dashboard to register (its `entry.url` to appear) before returning, so the proxy has a target when the client routes to `/p/<id>/`.
- **Non-blocking 4 — resolved.** The switcher onclick id is sanitized to `[A-Za-z0-9_-]` before the JS-string context (no-op for real UUIDs; defensive).
- **Non-blocking 5 — deferred (rationale).** A `base.ts` unit test isn't cleanly runnable from the node harness — `base.ts` is a browser module compiled into the Vite bundle (`dist/dashboard/assets`), not the `dist/index.js` barrel the tests import. Behavior is verified via the bundled `__IF_BASE__` check + the N212 proxy E2E. Left as-is rather than restructure for a test.
- **Gates:** build ✅ · typecheck ✅ · `test:node` **335 / 335** ✅.


---

## Round 2 — AI re-review (fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

Round-1 blocker fixed and every non-blocking addressed (the systemic one closed at the source). **Approved.**

### Checklist verification

- [x] **Blocker fixed:** sound `src = apiUrl(…)` (notifications.ts) → both HEAD `fetch` and `new Audio` are base-aware; `__IF_BASE__` bundled. Base-awareness now complete.
- [x] **NB1 (systemic) closed:** `POST /api/register` is loopback-only (server.ts:284). Legit dashboards register from localhost → unaffected (335/335 register-based tests pass); LAN peers can no longer inject a url/path. Root cause behind the N212/N214 SSRF guards + the start-cwd surface is closed at the source; the earlier guards remain as defense-in-depth.
- [x] **NB2:** start "already running" now uses `entry.online && entry.url` (authoritative), not a port guess.
- [x] **NB3:** start waits (≤5s) for the spawned dashboard to register (url set) before returning → no proxy race.
- [x] **NB4:** switcher onclick id sanitized to `[A-Za-z0-9_-]` (overview.ts:227).
- [x] All original N215 features unchanged + still pass.

### Blockers

- None.

### Non-blocking

- **NB5 (base.ts unit test) deferred** — reasonable: `base.ts` is a browser module in the Vite bundle, not importable by the node harness; behavior verified via the bundled `__IF_BASE__` + proxy E2E.

### Security & edge cases

- Register loopback-gate + start loopback-gate + fixed-arg/no-shell spawn — the hub's write/exec surfaces are now all localhost-only. The recurring "unauthenticated register + all-interfaces bind" theme is resolved.

### Notes

- Phase 3 complete. Gates: build ✅ · `test:node` **335/335** ✅ · typecheck ✅. Ready for human review → merge into `dashboard-improvements`. Remaining: N216 (SW notifications), N217 (PWA).


---

## Round 3 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

"Approved continue to N216" — human sign-off on the single-origin hub shell + switcher (base-awareness, proxy nav, start-and-go, register loopback-gate). Merges into `dashboard-improvements`.

### Blockers

None.

### Notes

- Phase 3 (the visible payoff) complete. Remaining: N216 (SW notifications), N217 (PWA).
