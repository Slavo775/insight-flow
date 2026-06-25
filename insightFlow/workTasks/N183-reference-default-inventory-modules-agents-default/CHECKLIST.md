# N183 — Reference: default inventory (modules, agents, default flow, master server) — Checklist

## Done criteria

- [ ] `default-modules.md` — shipped modules grouped by kind, with locked-vs-ejectable noted.
- [ ] `default-agents.md` — the 10 composed agents, their modules, and artifacts.
- [ ] `default-flow.md` — default flow's agents / 13 edges / 15 statuses / entry agents / install list.
- [ ] `master-server.md` — master config keys, endpoints (`GET /events`, `POST /api/register`, `GET /`), registry, status states.
- [ ] `sync-docs.mjs` reference category `position` changed so Reference sits LAST in the sidebar; `pnpm sync` regenerates `reference/_category_.json` accordingly.
- [ ] New pages placed in the Reference area; Concepts (N182) cross-links resolve.
- [ ] Tables grounded in source (`src/agents/modules/`, `composed/`, `project/default.json`, `src/master/`).
- [ ] Conceptual model / how-to / dashboard NOT duplicated here (out of scope).

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor warnings.
- [ ] `pnpm sync` regenerates the synced `reference/` with the new category position (folder NOT relocated).
- [ ] `npx prettier --check` passes on new files; `sync-docs.mjs` is the only code change.

## Verification

- [ ] Sidebar order ends with **Reference** (N181 deviation resolved).
- [ ] Spot-check counts: 10 agents, 3 locked module ids, 6 activity hooks, default-flow entry agents.
