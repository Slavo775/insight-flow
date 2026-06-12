# N111 — Flow editor — save/load round-trip via CRUD API — Checklist

## Done criteria

- [ ] Save persists via PUT and re-renders from server truth
- [ ] load→edit→save→reload deep-equal verified by test
- [ ] Validation errors inline, edit state preserved
- [ ] Stale revision rejected with 409 + reload prompt

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Two-tab stale-write and round-trip fidelity checks pass in playground
