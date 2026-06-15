# N118 — Guide — surface the task's flow + next step (reuse suggestNextSteps) — Checklist

## Done criteria

- [ ] Task map + suggestions read the task's flowId (not always default)
- [ ] current/next CLI output shows the task's flow + next agent(s)
- [ ] Missing/deleted flow degrades to default gracefully
- [ ] Pickers + state machine provably unchanged (no diffs to picker order)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] custom-flow next-step, deleted-flow fallback, and CLI flow+next output verified by tests + playground
