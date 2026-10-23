# N272 — Lock down local servers — hub proxy origin pin, Host/Origin gate, no ACAO *, bind 127.0.0.1

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

The dashboard (`:6006`) and the hub (`:6100`) have no trust boundary against browsers or LAN peers. Any web page can POST a hook module to the dashboard and install it into `.claude/settings.json` (code execution in the next Claude session). The hub proxies `//127.0.0.1:<any-port>/…` paths to arbitrary local ports, and its `/project/<id>/*` route has no gate and rewrites `Host` to loopback, so even a fixed dashboard can be reached through it. Both servers listen on every interface and send `Access-Control-Allow-Origin: *`. Source: `N271/AUDIT.md` **A01–A07, A35, A37, A52e, A81** (work-tasks part).

## Goal

1. The hub proxy only ever reaches the registered project's origin.
2. Every request to either server passes a Host allowlist; every non-GET passes an Origin / Sec-Fetch-Site check; the hub's `/project/*` route is gated itself.
3. No `Access-Control-Allow-Origin` header is sent anywhere.
4. Both servers listen on `127.0.0.1` by default.
5. A regression test exists for each of the above.

## Scope

### In scope

- `packages/taskflow/src/core/http-util.ts` — new home for shared trust helpers.
- `packages/taskflow/src/master/server.ts` — `proxyToProject` (~:557-580), `/project/` + `/p/` branches (~:834-874), `/events` (~:924), `/api/activity/*` (~:1121), `/api/version` (:909), `/api/logs` (:1019), `/api/hub/projects` (:1332), `/api/hub/refresh` (:1384), `LOOPBACK_HOSTS`/`headerHost`/`isTrusted*` (~:340-452), global ACAO headers (~:816-818), `listen` (:1592), `findFreePort` (:477-491).
- `packages/taskflow/src/dashboard/server/index.ts` — top of `dispatch` (:757-765), `/api/config` (:946-951), `/api/work-tasks/<name>` (:915-921), `/log/events` (:1417-1475), `listen` (:1667).
- `packages/taskflow/src/core/transport.ts` — SSE ACAO header (:58-64).
- New/extended tests in `packages/taskflow/test/`.

### Out of scope

- A pairing token for LAN mode (locked decision: not now).
- CSP / security headers on HTML responses → N274.
- Secret persistence order in `/api/install`, MCP install confirmation → N273.
- `listen` error handling, lock, registry → N282.
- Route-table refactor and JSON 404s → N284.

### Locked decisions (from N271 — do not re-ask)

- Both servers bind **127.0.0.1** by default.
- LAN access stays **opt-in via `INSIGHT_FLOW_TRUSTED_HOSTS`**, with today's Host-header check. **No pairing token.**

## Implementation plan

1. **Shared trust helpers.** Move `headerHost`, `isLoopbackHost`, `isTrustedHost`, `isTrustedLocalRequest`, `isTrustedActionRequest` from `master/server.ts` into `core/http-util.ts`; master imports them back. Fix the `[::1]` mismatch (WHATWG URL returns `"[::1]"`; strip brackets or add it to the set). `master-liveness.test.mjs` must stay green unchanged.
2. **Pin the proxy origin (A01).** In `proxyToProject`: `const base = new URL(targetBase); target = new URL(rest || "/", base); if (target.origin !== base.origin) → 403`. Keep the existing loopback check.
3. **Gate the hub (A03, A06, A35).**
   - Top of the `/project/` and `/p/` branches: GET/HEAD need `isTrustedLocalRequest`, everything else `isTrustedActionRequest`, else 403. Before proxying set `x-forwarded-host` to the original `Host`.
   - Gate `/events` before `transport.handleRequest` and gate `/api/activity/*`.
   - Switch `/api/version`, `/api/logs`, `/api/hub/projects`, `/api/hub/refresh` to the peer-checked `isTrustedActionRequest`.
4. **Gate the dashboard (A02, A05, A37).** At the very top of `dispatch` (before `transport.handleRequest`, so `/sse` is covered too):
   - Host allowlist on every request → `421`. When the peer is loopback and `x-forwarded-host` is present, check that value instead (the hub is gated in step 3).
   - Non-GET/HEAD: reject a foreign `Origin` or a cross-site `Sec-Fetch-Site` → `403`.
   - Body routes require `Content-Type: application/json` → `415`. The client already sends it (`client/api.ts`).
   - Keep the stricter `/hub/reregister` gate. The hook CLI must still reach `/log/events`: confirm `cli/commands/log-event.ts` (~:143) posts JSON with no `Origin`.
5. **Remove ACAO (A06).** Delete the headers in `dashboard/server/index.ts:764-765`, `master/server.ts` (~:816-818) and `core/transport.ts:62`. Simplify `OPTIONS` handling to match. Grep first for any cross-origin consumer (the audit found none).
6. **Delete `/api/config` (A07).** Grep `src/` and `test/` first.
7. **`/api/work-tasks/<name>` (A81).** Allow only `/^[\w.-]+\.json$/` and add a `resolve` + `startsWith(workDir + sep)` guard, like `/api/task-doc`.
8. **Bind loopback (A04).** Both `listen` calls and `findFreePort` use host `127.0.0.1` unless `INSIGHT_FLOW_TRUSTED_HOSTS` is set (then keep all interfaces). Check that `projectUrl` (`http://localhost:<port>`, `index.ts` ~:571) still connects, since Node may resolve `localhost` to `::1` first. Advertise `127.0.0.1`, or listen on both loopbacks.
9. **Tests.** Add `test/server-trust.test.mjs` (or extend `master-liveness` and `custom-defs-api`) covering every Done criterion below.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new trust tests.
- Manual: `insight-flow ui` → the dashboard works standalone and through the hub at `/project/<id>/`. Installing a module from the dashboard UI still works.
- `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: text/plain' --data '{}' http://127.0.0.1:6006/api/modules` → `403`.
- `curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' http://127.0.0.1:6006/api/work-tasks` → `421`.
- `curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:6100/project/<id>//127.0.0.1:6100/api/hub/projects'` → `403`.
- `lsof -nP -iTCP:6006 -sTCP:LISTEN` and the same for `:6100` show `127.0.0.1` only.

## Notes

- Detail and evidence for every finding: `insightFlow/workTasks/N271-*/AUDIT.md` (A01–A07, A35, A37, A52e, A81). Line numbers are from tree `30277e0`. Re-locate by symbol if they drifted.
- The hub deletes `Host` before proxying (`master/server.ts` ~:580), and the dashboard then sees peer `127.0.0.1`. That is why the gate must sit on the hub route (step 3) and not only in the dashboard.
- Existing master trust tests: `test/master-liveness.test.mjs` ~:399-812 (CSRF, allowlist widening, forged loopback Host from LAN).
- Related: N273 (install trust), N274 (CSP headers), N282 (listen errors), N284 (route table). Documented LAN boundary: N223 / N224.
- Recommended run: `/task-analyze N272` → `/task-implement N272`.
