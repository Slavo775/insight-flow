# N212 — Reverse-proxy spike: master serves a project dashboard (incl. SSE) on one origin — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** fix-needed

## Summary

The spike proves the approach: `master/server.ts` gains `proxyToProject()` + a `/p/<id>/*` route that streams a project dashboard (assets/APIs/**SSE**) on one origin, buffering only the small HTML shell to rewrite `/assets/` and inject a base hook. Verified live (HTML/asset/API 200, SSE streamed incrementally). Good, focused work and an honest SPIKE.md that correctly defers client base-awareness to N215. **One security blocker:** the proxy forwards to a registrant-controlled URL on a network-exposed, unauthenticated server → SSRF / open-proxy.

## Checklist verification

- [x] `/p/<id>/*` proxy handler resolves by registry id or `projectId` and streams — verified.
- [x] Shell + assets load under the prefix (asset rewrite + base hook) — verified.
- [x] JSON APIs proxied — verified (`/p/spike/api/project` 200).
- [x] SSE flows incrementally through the proxy — verified (`retry:` + `snapshot`, not buffered).
- [x] Base-path approach documented; `SPIKE.md` written.
- [ ] **Proxy target restriction** — missing (Blocker 1).

## Blockers

1. **SSRF / open-proxy: the proxy server-side-fetches a registrant-controlled URL on a LAN-exposed, unauthenticated master.**
   - **Where:** `packages/taskflow/src/master/server.ts` — `proxyToProject` (target = `entry.url`) reached via the `/p/<id>/*` route; `entry.url` is whatever `POST /api/register` was given. `/api/register` (line ~187) has **no loopback guard** (unlike `/api/projects/create`, N210), and `server.listen(config.port)` (line ~374) binds **all interfaces (0.0.0.0)**.
   - **Why:** any peer on the network can `POST /api/register {url:"http://169.254.169.254/…"}` (or any internal host), then `GET /p/<id>/` and have the **master fetch it and stream the response back** — classic SSRF and an open forward-proxy. N212 is what turns the stored URL into a server-side fetch (before, only the browser followed overview links). New surface, shipped in the master.
   - **Fix:** restrict proxy targets to **loopback** — dashboards always run locally, so this is correct and non-limiting. Before proxying, parse `entry.url` and require `hostname ∈ {localhost, 127.0.0.1, ::1}`; otherwise `403`. (Belt-and-suspenders options for later: bind master to `127.0.0.1`, or gate the proxy behind N214's per-project token.) Re-verify: a loopback-target project still proxies; a registered non-loopback URL is refused.

## Non-blocking

1. **Unescaped `prefix` interpolated into the injected HTML** (`<base href="${prefix}/">`). `prefix` is `/p/<raw-path-segment>`; a project registered with a `projectId` containing HTML-special chars, then requested, would reflect into the shell → possible reflected XSS. Same root cause (trusting registration). Escape the `href` value and/or validate the `projectId` charset. (The `window.__IF_BASE__` line is already `JSON.stringify`-quoted — safer.)
2. **No automated test** for the proxy (verified live only). Add an integration test in N215 (proxy to a stub HTTP server; assert asset + SSE passthrough) so the plumbing has a regression guard before more is built on it.
3. **Hop-by-hop headers forwarded verbatim** (`connection`, `transfer-encoding`, etc.). Harmless on localhost; a cleaner proxy strips hop-by-hop headers. Minor.

## Security & edge cases

- **Blocker 1** is the real gap. The loopback-target guard closes it cheaply and is the right default for a local tool.
- `pid` is only used as a registry key (not a filesystem path) → no path traversal.
- HTML detection by `content-type: text/html` correctly limits the buffer+rewrite to shells; everything else (incl. SSE) streams.

## Notes

- **Spike scope respected** — no app shell built; client base-awareness (absolute `/api`, `/sse`) correctly deferred to N215 with a concrete plan in SPIKE.md.
- Gates: build ✅ · test **325/325** ✅ · typecheck ✅.
- After the fix, this unblocks [[N215]]. Related: [[N213]], [[N214]] (the token could later gate the proxy).

---

## Fix (2026-07-10, task-review-fix)

- **Blocker 1 — resolved.** The proxy now refuses any non-loopback target: `target.hostname` must be in `{localhost, 127.0.0.1, ::1, [::1]}`, else **403** (`proxyToProject`, `LOOPBACK_HOSTS`). Dashboards are always local, so this closes the SSRF/open-proxy without limiting the feature. Covered by a test (a registered `http://example.com` target → 403).
- **Non-blocking 1 — resolved.** The injected prefix is now escaped: `escapeHtmlAttr` on the `<base href>` value, and `<` → `<` in the `window.__IF_BASE__` script literal — no HTML/script break-out from a malicious `projectId`.
- **Non-blocking 2 — resolved.** Added `test/master-proxy.test.mjs` (hermetic stub upstream + master): asserts the HTML rewrite + base hook, asset passthrough, **SSE streaming**, and the loopback **403** guard. Suite now **326/326**.
- **Non-blocking 3 — resolved.** Hop-by-hop headers (`connection`, `transfer-encoding`, `upgrade`, …) are stripped on both the forwarded request and response (`stripHopByHop`).
- **Extra (surfaced by the test):** the proxy now destroys the upstream request when the client disconnects (`res.on("close", …)`) — prevents a held-open connection leak to the project server, important for SSE tabs opening/closing.
- **Gates:** build ✅ · typecheck ✅ · `test:node` **326 / 326** ✅.


---

## Round 2 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

"approved" — human sign-off after the fix (SSRF loopback guard + all 3 non-blocking + upstream-close cleanup, 326/326). Merges into the `dashboard-improvements` integration branch (the PWA hub roadmap batch), not straight to main.

### Blockers

None.

### Notes

- Spike complete: reverse-proxy on one origin proven (HTML/asset/API/SSE), SSRF closed, tested. Unblocks N215.
- Staged on `dashboard-improvements`; N213–N217 will land there too, then the batch releases together.
