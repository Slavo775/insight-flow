# N131 — Generic flow-validated status setter — Checklist

## Done criteria

- [x] Flow-validated `setStatus(task, target, opts, flow?)` (core/set-status.ts)
      gates the target against the flow's status universe (declared set, else
      canonical fallback)
- [x] Lifecycle commands (implement/review/fix/push/merge/done/change-*) route
      through `writeStatus` (resolves the flow); default flow byte-identical
- [x] Out-of-graph transitions rejected (`InvalidStatusTransitionError`, clean
      CLI message via the top-level handler; task left unmutated)
- [x] Task.status validated relative to its flow, not a global enum

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (209; +6 in `test/status-setter.test.mjs`)
- [x] No regressions in affected area (existing suite green)

## Verification

- [x] full default-flow lifecycle parity (e2e create→implement→push→merge),
      custom in-set transition, and out-of-set rejection (unit + e2e) verified in
      `test/status-setter.test.mjs`
