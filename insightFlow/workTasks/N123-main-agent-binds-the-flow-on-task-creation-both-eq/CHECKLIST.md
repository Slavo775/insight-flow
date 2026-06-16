# N123 — Main-agent binds the flow on task creation (both-equal with type-map) — Checklist

## Done criteria

- [ ] create --agent binds the agent's flow
- [ ] Precedence --flow > --agent > byType > defaultFlow
- [ ] Multi-flow agent disambiguated (error / --flow)
- [ ] N116 type-map path unchanged

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] binding + precedence + ambiguity matrix verified by tests
