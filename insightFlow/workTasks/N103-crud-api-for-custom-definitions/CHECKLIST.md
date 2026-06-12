# N103 — CRUD API for custom definitions — Checklist

## Done criteria

- [ ] CRUD endpoints for modules/agents/projects writing only user space
- [ ] 400 validation / 403 built-in / 409 referenced-delete enforced
- [ ] Atomic file writes; registry reflects changes without server restart
- [ ] HTTP integration tests cover all failure modes

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Playground curl sequence (create→reference→409→cleanup) behaves as specified
