# N104 — Task-on-flow map — current state highlighted

**Type:** feat
**Priority:** high
**Created:** 2026-06-12

## Problem

- N96 ships a project flow map, but it is disconnected from real work: looking at a task tells you its status string, not where that status sits in the lifecycle flow. The task detail page should render the flow with the task's position highlighted.

## Goal

1. Task detail page (`/task/:id`) gains a flow-map section: the default project's flow rendered via the existing React Flow map with the node corresponding to the task's current status visually highlighted (distinct color + badge).
2. Status→node mapping derived from the flow definition's triggers (statuses/verdicts on edges), not a hardcoded table; statuses with no flow node degrade gracefully (map renders, info note shown).
3. Read-only; reuses `GET /api/project` (extended only if the payload lacks trigger data the client needs).
4. Works on mobile within the N93 responsive layout rules.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — task detail page composition; reuse/extend `FlowMap` with a `highlight` prop.
- Pure helper mapping `status → nodeId(s)` from a flow definition + unit tests (incl. change-request and incident side-flow statuses).
- `dashboard/server` only if `/api/project` needs trigger enrichment.

### Out of scope

- Suggestions (N105). Editing (N109–N111). Multiple-project selection (N108) — default project only here.

## Implementation plan

1. **Mapping helper** — from `flow: [{from,to,on}]` compute which agent node 'owns' each status; export for N105 reuse.
2. **Highlight prop** — `FlowMap` accepts highlighted node ids; styled distinctly (theme-consistent).
3. **Task page section** — fetch project, render map under the task detail, collapsible on mobile.
4. **Tests** — mapping helper unit tests; component smoke.

## Verification

- `pnpm build` green; on the playground, open a task in each major status (ready / in-progress / reviewing / fix-needed / pushed) and confirm the correct node lights up.
- A status outside the flow (if any) shows the graceful note instead of a broken map.

## Notes

- Depends on N96 output (FlowMap, /api/project). First user-visible win of the round; lands before forms/editor.
- N105 builds the suggestion list on top of the same mapping helper.
