# N99 — insightFlow layout — path indirection + back-compat shim — Checklist

## Done criteria

- [ ] `resolveFlowRoot` + helpers exist in `core/paths.ts` with layout detection
- [ ] No `workTasks`/`.events` string literals outside `paths.ts` and tests
- [ ] Un-migrated playground behaves identically (list/stats/dashboard/events)
- [ ] Tests cover legacy-only, insightFlow-only, both-present

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Temp project with `insightFlow/` layout resolves to new root; legacy playground resolves to old root — both verified by tests
