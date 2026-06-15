# N130 — Status badges/colors/titles read the flow's status defs — Checklist

## Done criteria

- [ ] Status styling resolves from the flow's statuses (title/color)
- [ ] Canonical fallback unchanged for default-only
- [ ] Consistent across kanban/detail/timeline
- [ ] Unknown status → neutral default

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] custom/canonical/unknown status styling verified across surfaces
