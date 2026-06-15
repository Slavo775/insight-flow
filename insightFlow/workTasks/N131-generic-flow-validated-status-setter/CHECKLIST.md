# N131 — Generic flow-validated status setter — Checklist

## Done criteria

- [ ] Flow-validated setStatus gates transitions by the task's flow graph
- [ ] Lifecycle commands route through it; default flow byte-identical
- [ ] Out-of-graph transitions rejected
- [ ] Task.status validated relative to its flow

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] full default-flow lifecycle parity + custom transition + rejection verified
