# N199 — Plain-language module — built-in simple-English section, composed into task-analyze — Checklist

## Done criteria

- [ ] Built-in `plain-language` `section` module created + registered in `MODULE_REGISTRY`
- [ ] Module content: plain English — short sentences, common words, no idioms, define jargon, prefer lists/steps
- [ ] Composed into the `task-analyze` agent
- [ ] `TASK_ANALYZER_ROLE.md` regenerated (compose --apply + sync-role-templates); drift guard green
- [ ] Available as opt-in for other agents (registered; not forced onto the rest of the baseline)
- [ ] Short doc entry in `built-ins/default-modules.md` (what it does + how to add it)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (incl. `compose.test` drift guard)
- [ ] `pnpm --dir website build` passes

## Verification

- [ ] `composeAgentById("task-analyze")` includes the plain-language section
- [ ] Module shows in the dashboard Modules browser; doc explains opt-in for other agents
