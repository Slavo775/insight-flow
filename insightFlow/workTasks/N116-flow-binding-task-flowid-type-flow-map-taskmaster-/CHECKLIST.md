# N116 — Flow binding — Task.flowId + type→flow map (taskmaster binds at create) — Checklist

## Done criteria

- [ ] `Task.flowId` on the schema (default `"default"`); legacy tasks read back as default
- [ ] `flows.byType` + `defaultFlow` config with shipped defaults
- [ ] `create` resolves --flow → byType → defaultFlow; unknown → default + note
- [ ] `flowId` exposed in CLI + dashboard task payloads

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] create-resolution matrix (type-mapped / explicit --flow / unknown→default) + legacy-default verified by tests
