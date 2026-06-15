# N129 — Kanban renders columns from flow status sets — Checklist

## Done criteria

- [ ] Kanban columns derived from flows' statuses (union, ordered)
- [ ] Default-only board identical to today
- [ ] Tasks group by status; cards show flow; orphan handled
- [ ] No code change to add a flow's columns

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] default parity + custom-flow columns + orphan handling verified
