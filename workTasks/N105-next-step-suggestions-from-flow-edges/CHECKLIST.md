# N105 — Next-step suggestions from flow edges — Checklist

## Done criteria

- [ ] suggestNextSteps covers every canonical status with table-driven tests
- [ ] Task page shows multi-branch suggestions with slash commands
- [ ] Map secondary-highlights suggested nodes
- [ ] Pickers and state machine provably untouched (no diffs in cli/commands pickers)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] fixed/approved/merged playground tasks show the specified suggestion sets
