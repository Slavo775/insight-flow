# N102 — User-space registries for custom modules/agents/projects — Checklist

## Done criteria

- [ ] Three user-space dirs load with existing Zod schemas
- [ ] custom: namespace enforced; built-in collision rejected
- [ ] Dangling module/agent refs fail with file+id
- [ ] Custom entries visible through existing read APIs

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Fixture custom module+agent+project load, merge, and compose in tests and in the playground
