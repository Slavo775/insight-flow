# N119 — Eject/override loader — insightFlow/ shadows shipped defaults — Checklist

## Done criteria

- [ ] Built-in-id file in insightFlow/ loads as an override (shadows shipped)
- [ ] Locked ids rejected as overrides
- [ ] Custom ids unchanged; unknown-id override rejected
- [ ] Merged registries reflect overrides

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] eject / override / locked / custom matrix verified by tests; merged registry shows the override
