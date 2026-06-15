# N113 — Flow editor — new flow picks its own agent set (no default inheritance) — Checklist

## Done criteria

- [ ] New-flow custom path no longer copies the default's agents
- [ ] Agent multi-select (built-in + custom) defaults to none selected
- [ ] 'Pick at least one agent' blocks submit on the custom path
- [ ] Duplicate-from-default unchanged (copies agents+flow+install)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Custom flow created with a hand-picked 2-agent set verified via /api/project; empty-selection submit blocked
