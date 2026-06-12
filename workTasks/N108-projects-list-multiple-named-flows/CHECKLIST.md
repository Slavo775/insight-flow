# N108 — Projects list + multiple named flows — Checklist

## Done criteria

- [ ] Shipped + custom flows listed; /project/:id deep-links
- [ ] Create (empty or duplicate-from-default) via UI; valid per ProjectSchema
- [ ] Default flow undeletable/uneditable; custom deletable
- [ ] Task maps unaffected (default flow only)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] hotfix duplicate flow created, rendered, deleted in playground; default intact
