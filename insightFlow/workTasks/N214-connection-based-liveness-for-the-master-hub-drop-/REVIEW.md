# N214 — Connection-based liveness for the master hub (drop polling) + light per-project token — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** fix-needed

## Summary

Solid, well-tested implementation of the design: a passive SSE liveness channel (`/api/hub/live` → online while open, offline on close), an on-demand `/api/hub/refresh` probe (no background timer), a per-project token verified on update/status/live, a project-side `/health`, `GET /api/hub/projects`, and register-by-path reconciliation (closes N213's deferred NB). 4 new tests + CLI E2E; 333/333. **One blocker:** `/api/hub/refresh` makes server-side `fetch`es to registrant-controlled URLs with no loopback restriction — an SSRF, the same class fixed for the proxy in N212.

## Checklist verification

- [x] `/api/hub/live` SSE: open → online, close → offline + broadcast — tested (test 2).
- [x] Dashboard holds the liveness connection + reconnect backoff (`holdLiveness`) — E2E.
- [x] Project `/health` validates the token (401 on mismatch) — E2E.
- [x] `/api/hub/refresh` probes all `/health` concurrently, updates + broadcasts — tested (test 3), **but see Blocker 1**.
- [x] Token issued at register; echoed on update/status/live; sent on probes; 401 on mismatch — tested (test 1).
- [x] `registry.online` + `lastSeenAt` from connection or probe; **no background timer** — verified.
- [x] Register-by-path reconciliation — tested (test 4).

## Blockers

1. **SSRF: `/api/hub/refresh` server-side-fetches registrant-controlled URLs without a loopback guard.**
   - **Where:** `packages/taskflow/src/master/server.ts` — the refresh handler: `fetch(`${e.url}/health?token=…`)` over every registry entry with a `url`. `e.url` is whatever `POST /api/register` supplied; register has no loopback guard and the master binds all interfaces. `LOOPBACK_HOSTS` (added in N212) gates the **proxy** only — the probe doesn't use it.
   - **Why:** a LAN peer registers `{ url: "http://169.254.169.254" }` (or any internal host/port), then `POST /api/hub/refresh`, and the master fetches it — a request-forgery + a blind internal-reachability oracle (`online` reflects `r.ok`, so you can port-scan the internal network). Same class as the N212 proxy SSRF.
   - **Fix:** only probe loopback targets (dashboards are always local, so this is correct and non-limiting). Parse `e.url` and skip / mark offline any entry whose hostname isn't in `LOOPBACK_HOSTS`:
     ```ts
     const entries = registry.getAll().filter((e) => {
       if (!e.url) return false;
       try { return LOOPBACK_HOSTS.has(new URL(e.url).hostname); } catch { return false; }
     });
     ```
     Re-verify: a loopback project is probed; a registered `http://example.com` is never fetched.

## Non-blocking

1. **Probe timer leaks on the error path.** `clearTimeout(t)` runs only after a successful `fetch`; on abort/throw it's skipped (self-clears in 1.5s, calling `abort()` on a settled controller — harmless). Move it to a `finally`.
2. **Token in the query string** (`?token=` on update/status/live/health). Query strings land in access logs / proxy logs more readily than headers. For a localhost tool it's low risk; an `Authorization`/`x-hub-token` header would be cleaner.
3. **`/api/hub/refresh` and `/api/hub/live` are callable by any (unauthenticated) caller.** With the loopback-target fix the blast radius is small, but an anonymous LAN caller can still make the master spray localhost requests / open connections. Consider gating these to loopback callers (like `/api/projects/create`, N210).
4. **Probe broadcasts every entry** (`for (const e of getAll()) broadcast(...)`), not just the ones whose `online` changed — minor SSE chatter.
5. **Reconcile re-key edge:** if the incoming `projectId` already indexes a *different* entry, `projectIdIndex.set(projectId, existing.id)` orphans that other entry from the index (still in `registry`, unreachable by projectId). Unlikely (path match ⇒ same project) but worth a guard/log.
6. **Half-open liveness** isn't detected without TCP keepalive — a silently-dropped socket keeps the project "online" until the master's next heartbeat write fails. Acceptable; note for robustness.

## Security & edge cases

- **Blocker 1** is the real gap; the loopback-target filter closes it cheaply and consistently with N212.
- Token verify on update/status/live is correct (401 on missing/wrong). Seeded/bulk-ui reconciliation returns the existing token so the live dashboard adopts it.
- `/health` token check rejects a stranger when a token is held; lenient before one is set (fine).

## Notes

- **Roadmap Phase 2**, on `dashboard-improvements`. Unblocks N215 (switcher consumes `/api/hub/projects` + triggers `/api/hub/refresh`).
- Gates green (build ✅ · 333/333 ✅ · typecheck ✅). The blocker is a small, contained filter — mirrors the N212 fix.
- Consider centralizing the loopback check into one helper reused by the proxy **and** the probe (avoids this exact divergence next time).

---

## Fix (2026-07-10, task-review-fix)

- **Blocker 1 — resolved.** `/api/hub/refresh` now filters probe targets to loopback: `getAll().filter((e) => e.url && isLoopbackUrl(e.url))`. A registrant-controlled non-loopback url is never fetched. New test (test 4): a `http://192.0.2.1` (TEST-NET-1, non-routable) entry stays offline and the refresh returns in < 1.2s — proving it was skipped (not fetched, which would have hung to the 1.5s abort).
- **Non-blocking 1 — resolved.** The probe's `clearTimeout(t)` moved into a `finally` (no timer leak on the error path).
- **Centralized (my recommendation) — done.** Added `isLoopbackHost(hostname)` + `isLoopbackUrl(url)` helpers; the **proxy** (N212) and the **probe** (N214) both use them, so they can't diverge again.
- **Deferred (documented, not required):** token-in-query → header (NB2), loopback-gating the refresh/live *callers* (NB3), broadcast-only-changed (NB4), reconcile re-key collision guard (NB5), half-open detection (NB6) — design trade-offs / larger changes, tracked for later.
- **Gates:** build ✅ · typecheck ✅ · `test:node` **334 / 334** ✅.


---

## Round 2 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

"Approved" — human sign-off after the SSRF fix (loopback-only probe + shared helper + finally-clearTimeout, 334/334). Merges into `dashboard-improvements`.

### Blockers

None.

### Notes

- Phase 2 of the PWA hub roadmap complete. Also closed the N213 deferred NB (register-by-path reconciliation). Unblocks N215 (app shell + switcher).
