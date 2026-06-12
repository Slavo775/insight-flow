# N104 — Task-on-flow map — current state highlighted — Checklist

## Done criteria

- [ ] Task page renders flow map with current-status node highlighted
- [ ] Mapping derived from flow triggers, no hardcoded status table
- [ ] Graceful fallback for unmapped statuses
- [ ] Mobile-usable per N93 rules

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Five playground tasks in distinct statuses each highlight the expected node
