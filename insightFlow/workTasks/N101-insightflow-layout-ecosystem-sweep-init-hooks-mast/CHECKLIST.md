# N101 — insightFlow layout — ecosystem sweep (init, hooks, master, docs) — Checklist

## Done criteria

- [ ] Fresh init scaffolds insightFlow/ layout
- [ ] No hardcoded workTasks paths in hooks/init/prompt-build output
- [ ] Docs/templates updated, single compat note remains
- [ ] This repo + playground migrated and fully green

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Temp-dir init round-trip and this-repo dashboard/hook smoke both pass post-migration
