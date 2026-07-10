# N214 — Connection-based liveness for the master hub (drop polling) + light per-project token — Checklist

## Done criteria

- [ ] Master liveness channel (`/api/hub/live?id&token`, SSE or WS): open → online, close → offline + broadcast (passive, real-time)
- [ ] Project dashboard opens + holds the liveness connection on boot, reconnects with backoff
- [ ] Project-side `GET /health` → `200` + status, validates the token
- [ ] Master on-demand probe endpoint probes all registered `/health` concurrently (short timeout), updates + broadcasts fresh status
- [ ] Master issues a per-project token at register; project echoes it on `update`/`status`/`live`; master sends it on `/health` probes
- [ ] Master rejects missing/wrong token (`401`)
- [ ] `registry` has `online` + `lastSeenAt`, from the connection or last probe
- [ ] **No background timer** loop (heartbeat-on-open-connection + on-demand probe only)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] Start a project → online in `/overview` within ~1s; kill it → offline within ~1s (passive)
- [ ] Trigger the on-demand probe → unreachable registered projects flip offline, reachable confirmed online; no timer running
- [ ] `/health` (or `update`) with wrong/missing token → `401`; correct token → `200`
