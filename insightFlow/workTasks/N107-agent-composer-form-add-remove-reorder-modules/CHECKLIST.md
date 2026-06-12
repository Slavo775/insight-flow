# N107 — Agent composer form — add/remove/reorder modules — Checklist

## Done criteria

- [ ] Custom agent create/edit with searchable add, remove, reorder
- [ ] Composition preview matches saved order
- [ ] Built-ins read-only; dangling refs rejected inline
- [ ] Saved agent visible in browser and composable

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] 3-module custom agent round-trip (build→save→reload→prompt-build) verified in playground
