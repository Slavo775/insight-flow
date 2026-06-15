# N121 — Default flow editable via eject — Checklist

## Done criteria

- [ ] Default flow editable in the editor
- [ ] Save writes insightFlow/projects/default.json override
- [ ] Revert removes the override (restores shipped)
- [ ] Custom flows unaffected; locked status set still protected

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] default-flow edit→override→revert verified in the playground
