# N112 — Per-flow custom state definitions (visual + suggestions) — Checklist

## Done criteria

- [ ] states field with mapsTo aliasing, fully validated
- [ ] Suggestions + task map honor aliases; canonical flows unchanged
- [ ] Tasks never store custom ids; pickers/CLI untouched
- [ ] Editor manages states with in-use guard

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] qa-verify alias scenario verified end-to-end in playground
