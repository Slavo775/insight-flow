# N268 — Chains page: list + editor for flow-of-flows in the dashboard

**Type:** feat
**Priority:** medium
**Created:** 2026-10-19

## Problem

- N267 adds chains (`insightFlow/chains/*.json`, `/api/chains`) but they can only be authored by hand. The dashboard has list/detail/editor pages for modules, agents and flows (`ProjectPage.tsx`, `FlowEditor.tsx`) — chains need the same surface so a user can see and build a flow-of-flows.

## Goal

1. A **Chains** section in the project dashboard: list of chains, detail view with a map, and an editor.
2. The editor reuses `FlowEditor`'s model: each **node is a flow**, its output ports are the flow's **terminal statuses**, its single input is the flow's **entry**. Dragging terminal → flow creates a link; an edge modal sets `mode` (`auto | gated`) and `when`.
3. Save/load round-trips through `POST/PUT/DELETE /api/chains` with the same revision/locked rules as flows.

## Scope

### In scope

- `dashboard/client/api.ts` — `listChains`, `getChain`, `createChain`, `updateChain`, `deleteChain` (mirror the project fns; `x-revision` header).
- `dashboard/client/App.tsx` — routes `/chain`, `/chain/new`, `/chain/:id`, `/chain/edit/:id`; nav entry next to Flows (`components/Header.tsx` / `SideLayout.tsx`).
- `dashboard/client/ChainPage.tsx` (new) — list + detail (mirror `ProjectPage.tsx`): chain title, ordered flows, links table (`from.on → to`, mode, when), "Edit" / "Delete".
- `dashboard/client/ChainForm.tsx` (new) — id/title/description + flow palette (add/remove flows from `mergedProjects` via `/api/projects`); embeds the map editor.
- `dashboard/client/components/ChainEditor.tsx` (new) — thin wrapper over `FlowEditor` primitives (`@xyflow/react` nodes/edges, ports, edge modal). Node = flow (title, terminal ports on the RIGHT, one entry port on the LEFT); edge = link with `mode`/`when`; `layout` persisted on the chain (`layout?: Record<flowId,{x,y}>` — add to `ChainSchema` in N267 style, optional).
- Validation in the UI mirrors N267's load checks: `on` must be terminal of `from`; `to` must have an entry agent (show inline error, disable Save).
- Empty state: "No chains yet — create one" with a one-line explanation.

### Out of scope

- Task-detail integration (chain bar, picker, Continue button) — N269.
- Installing anything (chains need no install).
- Composer MCP / authoring agents for chains.
- Editing the flows themselves from the chain editor.

## Implementation plan

1. **API client** — chain fns in `api.ts`; types imported from the package barrel (`Chain`, `ChainLink`).
2. **Routes + nav** — add `/chain*` routes and nav item; reuse `SideLayout`.
3. **ChainPage** — list + detail; reuse `Card`, `Section`, `Badge`, `StatusPill`.
4. **ChainEditor** — derive nodes from `chain.flows` × projects (`statuses.filter(terminal)` → right ports); edges from `links`; reuse `FlowEditor`'s edge modal pattern for `mode`/`when`; optional `layout`.
5. **ChainForm** — create/edit; Save → `createChain`/`updateChain`; Delete with confirm.
6. **Tests** — extend `custom-defs-api.test.mjs` if N267 did not already cover `chains`; a small render test for `ChainEditor` deriving ports from terminals (follow existing `flow-edit.test.mjs` style).

## Verification

- `pnpm build`; `pnpm play` → `/chain` lists chains from `playground/insightFlow/chains/`.
- Create a chain `default → custom:release-manager on merged (gated)` in the UI → file appears in `insightFlow/chains/`, `insight-flow chain-advance` (N267) accepts it.
- Linking from a non-terminal status is impossible (no port); linking to a flow with no entry agent shows an error.
- Edit mode/when on an edge → saved; reload shows it.

## Notes

- Depends on N267 (schema, `/api/chains`). If N267 did not add `layout` to `ChainSchema`, add it here (optional field, additive).
- Keep styling consistent with the N258–N265 facelift (Lovable design tokens in `theme.ts`).
- Related: N109/N110/N111/N115 (flow editor), N169 (terminal nodes), N269.
