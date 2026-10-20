# N272 — Lock down local servers — hub proxy origin pin, Host/Origin gate, no ACAO *, bind 127.0.0.1 — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `3a00e59` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

The trust helpers moved to `core/http-util.ts` and both servers now share one gate; the hub proxy is pinned to the project origin (every `//host`, `\\host`, `/..//host`, `%2F%2F`, userinfo and other-scheme escape is confirmed blocked); the hub's `/project/*`, `/events`, `/api/activity/*` and four read routes are gated; `ACAO:*` is gone everywhere; `/api/config` is deleted; `/api/work-tasks/<name>` is restricted; cross-site POSTs (including the `text/plain` simple request that opened the hook-install chain) are refused; both servers bind 127.0.0.1. All of that is correct and the legitimate flows (SPA, hub↔dashboard handshake, hook CLI, proxy incl. SSE, LAN mode) still work. **Two defects block merge:** the dashboard's `X-Forwarded-Host` handling overwrites the real `Host` before checking it, so a DNS-rebinding page in the user's own browser (a loopback peer) re-opens the entire read side of the gate; and `findFreePort` was not switched to 127.0.0.1 although the checklist claims it, which on macOS makes the hub spawn dashboards onto ports already held. Both are small fixes.

## Checklist verification

- [x] Trust helpers in `core/http-util.ts`; both servers use them; `[::1]` accepted — pass (`http-util.ts:96-205`; imports in both servers; `isTrustedActionRequest` re-exported)
- [x] Hub proxy refuses a target whose origin differs (`//`, `\\`, `//[::1]`) — pass in code (`master/server.ts:489-505`); tests exercise only the `//` form (non-blocking #6)
- [ ] `/project/*` and `/p/*` gated + `x-forwarded-host` forwarded — PARTIAL: `/project/*` gated (`:786-794`) and the header set (`:509`); the legacy `/p/*` branch (`:826-847`) is NOT gated (non-blocking #2)
- [x] `/events` + `/api/activity/*` gated; `/api/version`, `/api/logs`, `/api/hub/projects`, `/api/hub/refresh` peer-checked — pass (`:876`, `:1087`, `:857`, `:980`, `:1300`, `:1352`)
- [ ] Dashboard: Host allowlist on every request incl. `/sse` (421); non-GET Origin/Sec-Fetch gate (403) — PARTIAL: implemented (`index.ts:845-866`, before the SSE handoff) but the `X-Forwarded-Host` override defeats the 421 for a local browser (blocker 1)
- [x] No `Access-Control-Allow-Origin` anywhere — pass (grep: comments only; `transport.ts:60-65`)
- [x] `/api/config` deleted — pass (`index.ts:1064-1067`; no callers)
- [x] `/api/work-tasks/<name>` `.json` allowlist + prefix guard — pass (`index.ts:1032-1040`)
- [ ] Both servers and `findFreePort` bind 127.0.0.1 unless `INSIGHT_FLOW_TRUSTED_HOSTS`; no pairing token — PARTIAL: servers yes (`index.ts:1802-1852`, `server.ts:1575-1587`); **`findFreePort` not done** (`server.ts:396-410`) — the checklist claim is false (blocker 2); no pairing token, correct
- [x] `log-event` → `/log/events` from the hook CLI still accepted — pass (`log-event.ts:151` posts to 127.0.0.1 with no Origin; gate passes)
- [x] Quality gates — as run by the implementer (398/398 then); not re-run here
- [ ] Tests cover the listed cases — PARTIAL: cross-site POST, foreign Host, no ACAO, `/api/config`, `//` escape, cross-origin `/events` covered; missing: `\\` / `//[::1]` forms, the `/project/*` gate itself, `x-forwarded-host` forwarding, `/api/activity/*`, `/sse` → 421, the bind address, and the blocker-1 bypass (non-blocking #6)

## Blockers

1. **DNS-rebinding read gate (421) is bypassable via `X-Forwarded-Host` from the user's own browser** — `src/dashboard/server/index.ts:845-852`.
   **Why:** the code honors `X-Forwarded-Host` from any **loopback peer** and overwrites `req.headers.host` with it *before* `isHostTrusted` runs. The user's own browser is a loopback peer. Attack: a page at `http://evil.example:6006` rebinds `evil.example` → 127.0.0.1, then `fetch("/api/work-tasks/tasks-N00-N09.json", {headers:{"X-Forwarded-Host":"localhost"}})` — same-origin from the browser's view, and `X-Forwarded-Host` is not a forbidden header, so no preflight. Dashboard: `isLoopbackPeer` → true, `host` becomes `"localhost"`, `isHostTrusted` → true → 200. Every GET route is readable (shards, `/api/task-doc`, `/log/status`, `/api/modules`, and `/sse` via a streaming fetch). Writes stay blocked only because browsers send `Origin` on same-origin POST. "Loopback peer" distinguishes LAN vs local, not hub vs browser — it is the wrong trust anchor for overriding the Host.
   **Fix (AND, don't replace):** check the **real** Host first, then additionally require the forwarded host to be trusted:
   ```ts
   if (!isHostTrusted(req)) { sendJson(res, 421, …); return; }
   const fwdHost = req.headers["x-forwarded-host"];
   if (typeof fwdHost === "string" && fwdHost && isLoopbackPeer(req)
       && !isTrustedHost(headerHost(fwdHost), trustedHostSet())) { sendJson(res, 421, …); return; }
   ```
   (`isTrustedHost`, `headerHost`, `trustedHostSet` are already exported from `http-util`.) The hub path still works: its upstream Host is `127.0.0.1:<port>` (trusted) and the forwarded browser Host was already validated by the hub gate; LAN PWA works because the forwarded host is allowlisted. Add a test: `rawGet` with `Host: evil.example` + `X-Forwarded-Host: localhost` → 421.

2. **`findFreePort` still binds with no host while the dashboards it spawns bind 127.0.0.1** — `src/master/server.ts:396-410`.
   **Why:** the diff never touched it; the comment at `:393-395` ("the same all-interfaces bind the dashboard itself uses") is now false, and CHECKLIST line 13 / TASK.md step 8 claim it was changed. Concrete failure on macOS: libuv sets `SO_REUSEADDR`, and BSD lets a wildcard `::`/`0.0.0.0:p` bind succeed while another socket holds `127.0.0.1:p`, so the probe reports a port held by a 127.0.0.1-bound listener as free → the spawned `ui --port p` hits EADDRINUSE → the N282 handler exits → the hub waits 15 s → 504 "did not register". That is the exact N218 scenario the probe exists for, and N272 introduced the mismatch.
   **Fix:** `const host = listenHost(); host ? srv.listen(p, host) : srv.listen(p);` and update the comment. (`batch-ui.ts:22` already binds 127.0.0.1 explicitly, so bulk-ui is consistent.)

## Non-blocking

1. `src/master/index.ts:124` and `src/dashboard/server/index.ts:364` — server-to-server fetches still use `http://localhost:<port>` (hub boot handshake `/hub/reregister`; dashboard `waitForMaster`). Node ≥20 (`autoSelectFamily`) copes; Node 18 (`engines >=18`) resolves `localhost` → `::1` first on macOS/glibc and gets ECONNREFUSED against a 127.0.0.1-only listener — the handshake silently fails (the liveness-401 reregister recovers) and `waitForMaster` burns its full 3 s. One-token fix each: `127.0.0.1`.
2. `src/master/server.ts:826-847` — the legacy `/p/<id>/*` branch only 301s and the target is gated, but a rebinding page can read the `Location` header and learn the registry-uuid → projectId mapping. Gate it with the same check, or fix the checklist wording.
3. `src/dashboard/server/index.ts:613, 820` — the default `masterUrl` is now `http://127.0.0.1:6100` and is also used as the `/overview` iframe src (`:997-1009`), while the hub prints/opens `http://localhost:6100`. Browser storage, Notification permission and SW registration are per-origin, so the embedded overview and the standalone hub now have separate hub-notify settings/SW and can double-notify. Keep 127.0.0.1 for server-to-server only; use `localhost` for the browser-facing iframe default. (`dashboard.ts:161-162` still treats `http://localhost:6100` as the default.)
4. `src/master/server.ts:786-790` — `GET /project/<id>/` is a top-level navigation; `isTrustedLocalRequest` rejects `Sec-Fetch-Site: cross-site`, so a deep link clicked from any web page (README, GitHub, web Slack) 403s with a JSON body. Harmless for a navigation. Hardening: skip the Sec-Fetch-Site check when `sec-fetch-mode: navigate` / `sec-fetch-dest: document`, or serve the HTML error page.
5. `src/dashboard/server/index.ts:1028-1031` — the comment says the new guard fixes "symlinks"; it does not (no realpath). Only the user's own workDir can contain such a link, so no exposure — trim the comment.
6. Test coverage vs the spec's "a regression test for each": add at minimum the blocker-1 bypass test; also the `\\` / `//[::1]` escape forms, a cross-origin GET/POST through `/project/*` → 403, `x-forwarded-host` forwarding, `/api/activity/*`, `/sse` → 421, and the 127.0.0.1 bind.
7. `core/http-util.ts:177-179` — the host check is port-insensitive: a page on ANY localhost port (e.g. a malicious dev server at `localhost:3000`) passes the Origin check for a POST to `localhost:6006`; only `Sec-Fetch-Site: same-site` saves it, which Safari < 16.4 doesn't send. Pre-existing N221 design; consider comparing the full origin (incl. port) against the dashboard's own origin and the configured hub origin.
8. Spec step 4's `Content-Type: application/json → 415` was dropped with a documented rationale (Origin always accompanies a cross-site POST). Accepted deviation.

## Security & edge cases

- Verified closed: open proxy via `//host:port`, `\\host`, `/..//host`, `%2F%2F`, `user@host`, other scheme (`master/server.ts:489-505` — `rest` always starts with `/`, WHATWG turns `\` into `/`, `..` is normalized before the `/project/` regex, `%2F%2F` stays a same-origin path, `//[::1]:x` fails the origin compare, userinfo is dropped by `origin`; no false rejects for query strings / encoded chars). Hub proxy gated before the registry lookup; `/hub/*` never proxied. Hub `/events` gated before the SSE handoff. Dashboard Host gate runs before `transport.handleRequest` so `/sse` is covered (modulo blocker 1). Cross-site POST incl. `text/plain` → 403; `Origin: null` → 403; `same-site`/`cross-site` → 403; HEAD/OPTIONS skipped but no route mutates on them. OPTIONS: hub answers 204 with no ACAO; dashboard falls through with no ACAO → preflights fail. Forged `X-Forwarded-Host` from a **LAN** peer is ignored; the hub overwrites any client-supplied value with its own Host; duplicate headers join with ", " → unparseable → untrusted. `[::1]` handling is correct and not over-permissive (`127.1`/`0x7f.0.0.1` normalize to genuine loopback). `/api/work-tasks` basename + prefix guard; secrets live outside workDir. Error bodies leak nothing new.
- Blocker 1 is the one real hole: it re-opens exactly the read side of A02/A05 for a rebinding attacker, because the dashboard trusts a client-settable header from any local process — including the browser.

## Notes

- Fix order: blocker 1 (reorder the check + validate the forwarded host; add the bypass test) → blocker 2 (`findFreePort` host) → non-blocking #1 (the two `localhost` server-to-server fetches) are the three that matter before merge; #2–#8 can follow.
- Hand-off: `/task-review-fix N272` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — X-Forwarded-Host rebinding bypass — FIXED** (`dashboard/server/index.ts`): the real peer `Host` is now validated with `isHostTrusted` FIRST; only then is a forwarded host honored, and only one that is itself trusted (`isTrustedHost(headerHost(fwdHost), trustedHostSet())`), before overwriting. Regression test `dashboard: X-Forwarded-Host cannot override a foreign Host` → 421.

**Blocker 2 — findFreePort wildcard bind — FIXED** (`master/server.ts`): the probe now binds `listenHost()` (127.0.0.1 by default), matching the host the spawned dashboards bind, so a port held by a loopback listener is no longer reported free. Comment corrected.

**Non-blocking addressed:**
- #1 server-to-server `localhost`→`127.0.0.1` in `waitForMaster` (`index.ts`) and the hub re-register fetch (`master/index.ts:124`).
- #2 legacy `/p/*` redirect now gated (same navigation-aware check as `/project/*`) so a cross-site fetch can't follow the 301 and leak the uuid→projectId mapping. Test added.
- #3 the `/overview` iframe now defaults to a browser-facing `localhost:6100` (server-to-server registration stays `127.0.0.1`), so the embedded overview shares the hub's origin and no longer double-notifies; an explicit `master.url` is respected for both.
- #4 `/project/*` GET now allows a top-level navigation to a trusted Host (new `isTopLevelNavigation` helper) so a clicked deep link no longer 403s, while a cross-site fetch/XHR and all writes stay blocked. Test added.
- #5 trimmed the inaccurate "symlinks" claim from the `/api/work-tasks` guard comment.

**Non-blocking deliberately left (with reason):**
- #6 (extra coverage) — added the blocker-1 bypass, `/project/*` nav-vs-fetch, and `/p/*` tests; did not add a dedicated `findFreePort` bind test (it is an un-exported internal helper and now mirrors the already-tested `listenHost()` bind).
- #7 port-insensitive Host check — pre-existing N221 design; comparing full origin (incl. port) risks breaking the legit hub↔dashboard handshake; left as-is.
- #8 dropped `Content-Type → 415` — accepted deviation (a cross-site POST always carries a foreign Origin, already rejected).

Verified: typecheck + lint + build clean; `server-trust.test.mjs` 11/11.
