# N128 — status-transition module kind + Project.statuses (flow status set) — Checklist

## Done criteria

- [ ] status-transition module kind added (locked tier)
- [ ] ProjectSchema.statuses ordered set; default = canonical enum
- [ ] Edges/states/transitions constrained to the flow's status set
- [ ] No engine behavior change (data only)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] schema validation matrix + default canonical set verified by tests
