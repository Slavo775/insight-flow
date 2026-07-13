# N214 — Connection-based liveness for the master hub (drop polling) + light per-project token — Checklist

## Done criteria

- [x] Master liveness channel (`GET /api/hub/live?id&token`, SSE): open → online, close → offline + broadcast (passive, real-time)
- [x] Project dashboard opens + holds the liveness connection on boot (`holdLiveness`), reconnects with capped backoff
- [x] Project-side `GET /health` → `200` + status, validates the token (401 on mismatch)
- [x] Master on-demand probe endpoint (`POST /api/hub/refresh`) probes all registered `/health` concurrently (1.5s timeout), updates + broadcasts fresh status
- [x] Master issues a per-project token at register (returned as `{id, token}`); project echoes it on `update`/`status` (`?token=`) + `live`; master sends it on `/health` probes
- [x] Master rejects missing/wrong token (`401`) on update/status/live
- [x] `registry` has `online` + `lastSeenAt`, from the connection or last probe
- [x] **No background timer** loop (heartbeat-on-open-connection + on-demand probe only)
- [x] Bonus (N213 NB1): register sends `path`; master reconciles a seeded/bulk-ui entry by path
- [x] `GET /api/hub/projects` (observable registry for the switcher, N215)

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**333/333**, +4)
- [x] typecheck passes

## Verification

- [x] Start a project → online in the registry within ~1s; kill it → offline within ~1s (`master-liveness.test.mjs` + CLI E2E "online after kill: false")
- [x] Trigger the on-demand probe → reachable `/health` → online, failing `/health` → offline (test 3)
- [x] `update`/`live` with wrong/missing token → `401`; correct token → `200` (test 1); `/health` token logic active (E2E 401)
- [x] Register-by-path reconciliation: second register with same path adopts the entry, no duplicate (test 4)
