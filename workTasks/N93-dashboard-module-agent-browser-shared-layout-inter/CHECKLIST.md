# N93 — Dashboard module & agent browser — shared layout + interactive composition maps — Checklist

## Done criteria

- [ ] Shared `SideLayout` (left menu / right content) used by both new page families
- [ ] `/module` + `/module/:id` (splat-safe for ids containing `/`): grouped sidebar, full kind-specific detail (section/include/mcp-server/hook/skill), referenced-by agent links
- [ ] `/agent` + `/agent/:id`: agent list sidebar; interactive React Flow composition map with ordered, kind-styled module nodes and pretty titles
- [ ] Module nodes in the agent map navigate to the module detail; module detail has its own map view
- [ ] `GET /api/modules` + `GET /api/agents` serve registry data incl. `referencedBy`; SPA fallback covers the new routes
- [ ] Only new dependency is `@xyflow/react` (human-approved)
- [ ] Navigation links to Agents/Modules from the existing dashboard chrome
- [ ] Existing pages (kanban / timeline / task detail) unchanged

## Quality gates

- [ ] `pnpm build` passes (tsc + Vite bundle)
- [ ] Lint passes (no new findings vs main)
- [ ] `pnpm --filter insight-flow test` passes (no server regressions)

## Verification

- [ ] Playground `insight-flow ui`: `/agent/task-implement` shows 11 ordered nodes; clicking `minimal-diff` lands on its detail with body + 3 referencing agents; `/module/testing/hook` shows event/matcher/command
- [ ] Hard-refresh on `/agent/task-implement` serves the SPA (no 404)
