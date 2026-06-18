# N148 — flow-editor relation picker — status change vs handover (auto/gated)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-18

## Problem

- The flow editor's relation picker only asks for a trigger (`on`). The owner wants authoring a relation to offer **"status change" vs "handover to this agent"**, and when handover is chosen, set **auto/gated** — persisted onto the edge's `handover` field (N147). This is the authoring surface that makes a relation a real handover (the source agent then gets a `## Handover` section via N149), and it must work even when the source is a built-in agent (writes the project-scoped edge, never the agent).

## Goal

1. When drawing a new connection, the picker offers the existing optional trigger PLUS a "Handover to this agent" toggle and, when on, an auto/gated select.
2. The edge-edit modal exposes the same controls to add/change/remove handover on an existing edge.
3. The choice persists into `edge.handover` through the FlowDraft → Save path (no agent mutation; works for built-in sources).
4. Round-trips: reload shows the saved handover/mode.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — extend the `pending` connect overlay (`PickerOverlay`) and the `edgeMenu` `EdgeModal` with a "Handover to this agent" checkbox + an auto/gated `<select>` (shown when checked). Thread `handover` through `toFlowEdge`/`toReactFlowEdge`, `confirmPending`, `saveEdgeTrigger`, and the `FlowDraft.flow` carried by `report(...)`.
- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` `FlowEdge` construction — set `handover: { mode }` when toggled, omit when not.
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — ensure the save path (`saveDefinition('projects', …)`) includes `edge.handover` (it already serializes `draft.flow`; confirm the field passes through).
- If the agent editor (`AgentForm.tsx`) offers relation wiring, mirror the toggle there; otherwise note it's flow-editor-only this iteration.

### Out of scope

- The edge schema (N147 — assumed merged).
- Install-time `## Handover` composition (N149) and diagram badge restyle (N150) — though basic persistence is testable here.
- No change to the N142 agent-module handover authoring (that stays in ModuleForm/AgentForm).

## Implementation plan

1. **Pending-connect overlay.** In the `PickerOverlay` (the `pending` branch), add a "Handover to this agent" checkbox + auto/gated select (default gated, hidden until checked). Keep the trigger `<select>` (TriggerOptions) as-is — they're independent.
2. **Edge modal.** In the `edgeMenu` `EdgeModal`, add the same controls seeded from the edge's current `handover`; allow clearing it.
3. **Persist.** Update `confirmPending` + `saveEdgeTrigger` to build `FlowEdge` with `handover?: { mode }`; update `toReactFlowEdge`/`toFlowEdge` to carry `handover` in the React-Flow edge `data` so it survives round-trips and `report(...)` emits it in `FlowDraft.flow`.
4. **Save path.** Verify `ProjectPage` persists `draft.flow[].handover` via the CRUD save; add it if dropped.
5. **Verify** (below).

## Verification

- `pnpm --dir packages/taskflow run typecheck` (client) clean; build OK.
- In `pnpm play` (or is-test): connect two agents → toggle "Handover" + pick `auto` → Save → reload: the edge persists `handover: { mode: "auto" }` in the project JSON; editing the edge shows the toggle on.
- Works with a built-in source agent (e.g. Taskmaster) — saves the edge handover, no agent file written.

## Notes

- Depends on **N147**. Pairs with **N149** (consumes the edge handover at install) and **N150** (renders it).
- Reuse existing FlowEditor pieces: `TriggerOptions`, `PickerOverlay`, `EdgeModal`, `toReactFlowEdge`/`toFlowEdge`, `FlowDraft`. Keep diffs minimal; match the styled-components patterns already in the file.
