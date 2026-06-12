# N109 — Flow editor — draggable nodes with persisted layout — Checklist

## Done criteria

- [ ] Optional layout field on ProjectSchema, validated
- [ ] Drag + explicit Save persists positions for custom flows
- [ ] Stored layout honored in all map renders; fallback auto-layout
- [ ] Dirty-state guard on exit

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Drag→save→reload position fidelity verified in playground
