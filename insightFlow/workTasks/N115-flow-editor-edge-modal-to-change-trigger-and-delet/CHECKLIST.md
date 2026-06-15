# N115 — Flow editor — edge modal to change trigger and delete relationship — Checklist

## Done criteria

- [ ] Edge click (edit mode) → modal with change-trigger + delete
- [ ] Trigger picker covers canonical statuses ∪ this flow's custom states
- [ ] Trigger change validated against duplicate (from,to,on) triples
- [ ] Edge delete works from the modal; keyboard shortcut retained

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Trigger change (incl. to a custom state) + edge delete verified across Save+reload; duplicate-triple change blocked
