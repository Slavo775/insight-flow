# N108 — Projects list + multiple named flows

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- N96 ships exactly one project flow (`project/default.json`). The customization layer calls for multiple named flows per workspace — e.g. a full lifecycle flow and a lightweight hotfix flow — listable, creatable, and selectable in the dashboard.

## Goal

1. Multiple project-flow definitions supported: shipped default + any number of user-space `insightFlow/projects/custom:*.json` (N102), all conforming to `ProjectSchema` with triggers constrained to the existing status/verdict enums.
2. `/project` becomes a list+detail surface: sidebar lists all flows (default badged as shipped), content shows the selected flow's map (existing N96 renderer); deep-link `/project/:id`.
3. 'New flow' creates a minimal valid flow via N103 (`POST /api/projects`) — title/description + optional 'duplicate from default' starter; custom flows get Edit/Delete (delete confirms; default undeletable).
4. The default project remains the one consumed by install/hooks and by N104/N105 task maps this round; a task-level flow selector is explicitly future work.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — project list sidebar, `/project/:id` routing, new-flow dialog (duplicate-from-default option).
- `GET /api/projects` (list) added/extended alongside the existing single-project endpoint; N103 handles writes.
- Tests: list merge (shipped+custom), duplicate-from-default produces a valid independent copy.

### Out of scope

- Flow editing canvas (N109–N111) — flows created here are viewed read-only until then. Per-task flow assignment. Custom states (N112). Prescriptive behavior.

## Implementation plan

1. **API** — list endpoint returning shipped + custom flows with origin flags.
2. **Sidebar list** — SideLayout family; selection routes to `/project/:id`; default badge.
3. **Create dialog** — name/slug (`custom:` preview), empty vs duplicate-from-default; POST and navigate.
4. **Guards** — default flow: no edit/delete affordances; custom: delete with confirm.
5. **Tests** — list/create/duplicate/delete via HTTP + component smoke.

## Verification

- Playground: create 'hotfix' flow duplicated from default → appears in sidebar, renders identical map; delete works; default cannot be deleted.
- N104/N105 task maps still bind to the default flow only.

## Notes

- Depends on N102+N103+N96. N109–N111 make these flows editable; until then duplicate-from-default is the useful path.
