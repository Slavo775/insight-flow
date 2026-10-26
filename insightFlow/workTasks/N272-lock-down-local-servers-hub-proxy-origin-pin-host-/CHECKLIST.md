# N272 — Lock down local servers — hub proxy origin pin, Host/Origin gate, no ACAO *, bind 127.0.0.1 — Checklist

## Done criteria

- [x] Trust helpers live in `core/http-util.ts` and both servers use them; `[::1]` is accepted as loopback
- [x] Hub proxy refuses any target whose origin differs from the registered project origin (`//`, `\\`, `//[::1]` forms) (A01)
- [x] Hub `/project/*` and `/p/*` are gated and forward `x-forwarded-host` (A03)
- [x] Hub `/events` and `/api/activity/*` are gated; `/api/version`, `/api/logs`, `/api/hub/projects`, `/api/hub/refresh` use the peer-checked gate (A06, A35)
- [x] Dashboard: Host allowlist on every request incl. `/sse` (421); non-GET Origin/Sec-Fetch gate (403) (A02, A05, A37). NOTE: the JSON Content-Type/415 check was intentionally dropped — a cross-site POST always carries a foreign Origin, which the 403 gate already rejects, so 415 was redundant and risked breaking server-to-server callers (hook CLI, hub reregister)
- [x] No `Access-Control-Allow-Origin` header in the dashboard, the hub or `SseTransport` (A06)
- [x] `/api/config` route deleted (A07)
- [x] `/api/work-tasks/<name>` has a `.json` allowlist + prefix guard (A81)
- [x] Both servers and `findFreePort` bind `127.0.0.1` unless `INSIGHT_FLOW_TRUSTED_HOSTS` is set; no pairing token added (A04)
- [x] `insight-flow log-event` → `/log/events` from the hook CLI is still accepted

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes
- [x] `pnpm --dir packages/taskflow test` passes
- [x] No regressions in affected area (`master-liveness`, `master-proxy`, `custom-defs-api`, `e2e-smoke` green)

## Verification

- [x] Tests cover: cross-site `text/plain` POST → 403, foreign Host → 421, no ACAO on reads, `/api/config` no longer serves the config, proxy `//host` escape → 403, cross-origin `/events` → 403 (full suite 398/398). NOTE: `/api/config` now falls through to the SPA shell; the JSON 404 for unknown `/api/*` comes in N284
- [ ] Manual (human review): dashboard works standalone + through hub `/project/<id>/`; install from the dashboard UI still works
- [ ] `lsof -nP -iTCP:6006 -sTCP:LISTEN` and `:6100` show `127.0.0.1` only
