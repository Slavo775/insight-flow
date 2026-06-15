# N114 — Flow editor — add/remove agents in edit mode (palette + node popover)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- The flow editor cannot change a flow's agent set: `FlowEditor` (`packages/taskflow/src/dashboard/client/components/FlowEditor.tsx`) seeds its nodes from the read-only `project.agents` and the draft only carries `{positions, flow}` (+ N112 states). There is no way to add an agent node or remove one — only drag existing nodes. Authors need to add and remove agents while editing.

## Goal

1. The edit-mode draft carries the `agents` list (alongside positions, flow, and N112 states); Save (`PUT` via N111) persists it.
2. An 'Add agent' palette in edit mode lists composed agents (built-in + custom) **not already in the flow**; selecting one adds a node (default position) to the draft.
3. Clicking a node in edit mode opens a popover with **Remove from flow**, which removes the node **and all its incident edges** from the draft (read-mode `FlowMap` still navigates to `/agent/:id` — only the editor diverges).
4. Unused custom states left behind by a removal are harmless (the N112 in-use guard handles cleanup) — documented, no extra guard logic.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — draft shape gains `agents`; `onNodeClick` opens a remove popover; an add-agent control/palette; incident-edge cascade on remove.
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — the edit-mode draft state + Save payload include `agents` (today it passes `project.agents` verbatim).
- Registry source for the palette: `useRegistry().agents` (built-in + custom, N107).
- A small popover component (or reuse an existing one) anchored to the clicked node.

### Out of scope

- Editing edges / triggers (N115).
- New-flow agent picking (N113).
- Pruning unused custom states on removal (left to the N112 states editor).

## Implementation plan

1. **Draft carries agents** — lift `agents` into the editor draft (`{ agents, positions, flow, states }`); seed from `project.agents`; thread through `onDraftChange` and the N111 Save payload.
2. **Add palette** — edit-mode control listing `registry.agents` minus current; on pick, append the agent id + a node at a sensible default position; mark dirty.
3. **Node popover** — `onNodeClick` (edit mode only) opens a popover; 'Remove from flow' filters the agent out of the draft and drops every edge whose `from`/`to` is that agent; mark dirty.
4. **Tests** — pure helper for 'remove agent ⇒ agents minus id + edges minus incident' (unit); component smoke for add + remove.

## Verification

- `pnpm build` + suite green.
- Playground: in a custom flow's edit mode, add an agent via the palette (node appears, persists on Save); click a connected node → Remove → node and its edges vanish; reload shows the persisted set.
- Read-mode map still navigates to `/agent/:id` on node click (unchanged).

## Notes

- Decisions from /task-analyze: node interaction is click→popover; add bundled with remove (shared draft-carries-agents plumbing). Builds on N109–N111 editor + N107 registry.
- Removing a node must cascade its incident edges or the saved flow would reference a missing agent (ProjectSchema rejects edges to undeclared agents).
