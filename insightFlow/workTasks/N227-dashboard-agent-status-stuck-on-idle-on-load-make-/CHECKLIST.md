# N227 — Dashboard agent status stuck on idle on load — make backend the single source of truth over SSE — Checklist

## Done criteria

- [ ] Dashboard shows correct active/idle on first load (not stuck "idle")
- [ ] Initial SSE `snapshot` payload includes the derived active/idle status
- [ ] Server EventStore status is seeded from the durable activity log on startup (not defaulted to idle)
- [ ] Client `applySnapshot` sets `agentStatus` from the snapshot, not the hardcoded default
- [ ] Master landing page uses the backend-provided status (no independent re-derivation)
- [ ] One authoritative derivation; redundant client/master copies removed or redirected
- [ ] Transport unchanged (SSE); no websocket, no new persisted status file

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (tsc + vite)
- [ ] eslint clean on changed files (pre-commit: prettier + eslint --fix + typecheck)
- [ ] Live SSE status updates still work (no regression in existing stream)

## Verification

- [ ] Fresh load with agent active → badge shows "active" immediately
- [ ] Restart dashboard server (last activity "active") → reload still shows "active" (seeded from durable log)
- [ ] Master and dashboard show the same active/idle value for the same project simultaneously
- [ ] New activity event → badge updates live over SSE
