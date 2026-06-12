# N100 — insight-flow migrate-layout command — Checklist

## Done criteria

- [ ] `insight-flow migrate-layout` exists with `--dry-run`
- [ ] Fresh migrate, no-op re-run, dry-run, and partial-state refusal all covered by tests
- [ ] Migrated temp project passes list/stats/log-event/dashboard smoke
- [ ] JSON contents byte-identical before/after

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] On a playground copy: dry-run plan → migrate → verify CLI+dashboard → re-run no-op, all observed
