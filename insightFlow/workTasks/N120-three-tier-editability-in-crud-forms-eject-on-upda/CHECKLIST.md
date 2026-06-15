# N120 — Three-tier editability in CRUD + forms (eject-on-update, locked read-only) — Checklist

## Done criteria

- [ ] PUT built-in writes an override (except locked → 403)
- [ ] DELETE built-in 403; revert removes the override
- [ ] Forms: Edit on defaults, locked badge, Revert, custom CRUD intact
- [ ] Merged view reflects the override after save

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] API tier matrix (custom/default/locked) + revert + form smoke verified
