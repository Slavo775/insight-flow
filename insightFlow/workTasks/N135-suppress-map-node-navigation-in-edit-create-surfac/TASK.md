# N135 — Suppress map node navigation in edit/create surfaces

**Type:** fix
**Priority:** medium
**Created:** 2026-06-16

## Problem

The interactive maps navigate to a detail page on node click. That's correct in
read-only views, but the same `CompositionMap` is embedded as a **live preview
inside the agent create/edit form** (`AgentForm.tsx:357`) with no click override.
Clicking a node mid-edit calls `CompositionMap`'s default `navigate()`
(`CompositionMap.tsx:164`), leaving the form and **silently discarding unsaved
input** — it routes to `/module/:id`, or to the dead `/agent/__preview` for the
preview agent node (id `agent:__preview`).

## Goal

1. Give the shared maps a way to suppress node-click navigation.
2. Apply it in every map rendered inside an edit/create surface so clicks never
   discard in-progress work.
3. Fix the concrete `AgentForm` preview data-loss bug.
4. Leave read-only detail-map navigation unchanged.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/CompositionMap.tsx` — add a
  `readOnly?: boolean` (suppress-navigation) prop; honor it in `onNodeClick`
  (~line 164) while still allowing an `onModuleClick` modal handler.
- `packages/taskflow/src/dashboard/client/AgentForm.tsx` — make the preview map
  (~line 357) non-navigating. **Preferred:** wire `onModuleClick` to the
  in-place `ModuleInfoModal` (as `AgentDetail.tsx:55,105` does); inert clicks are
  an acceptable fallback.
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` — add the same
  `readOnly` capability for symmetry / future edit-surface embeddings.

### Out of scope

- Read-only `AgentDetail` / `ModuleDetail` map behavior (navigation stays).
- `FlowEditor` (already non-navigating; flow edit swaps `FlowMap`→`FlowEditor`).
- Adding new preview maps to `ModuleForm` (none today — capability is
  forward-looking there).

## Implementation plan

1. **Add the capability** — in `CompositionMap.tsx` add `readOnly?: boolean`. In
   `onNodeClick` (~line 164), when `readOnly` and no `onModuleClick` is provided,
   do nothing; otherwise keep the existing module-modal / navigate branches.
2. **Fix AgentForm** — at `AgentForm.tsx:357` pass the new behavior. Preferred:
   add `openModuleId` state + `ModuleInfoModal` (mirror `AgentDetail`) and pass
   `onModuleClick={setOpenModuleId}`, so the preview opens the module modal and
   never navigates; ensure the `agent:__preview` node can't navigate.
3. **FlowMap symmetry** — add `readOnly?: boolean` to `FlowMap` (~line 159);
   default keeps navigation so current read-only usage is unchanged.
4. **Regression guard** — confirm `AgentDetail` and `ModuleDetail` still navigate
   / open modals exactly as before (they don't pass `readOnly`).

## Verification

- `pnpm build` passes.
- `pnpm play` → `/agent/new` → add 2+ modules → preview renders → clicking a node
  does **not** navigate away and the form is preserved (preferred: a module info
  modal opens).
- `/agent/edit/:id` on a custom agent → same: preview clicks never leave the form.
- Regression: `/agent/:id` and `/module/:id` detail maps still navigate / open
  modals as before.

## Notes

- Root cause: `AgentForm.tsx:357` renders
  `<CompositionMap nodes={previewNodes} edges={previewEdges} />` with no
  `onModuleClick`, so the default `navigate()` fires; the preview agent node id
  `agent:__preview` produces a dead `/agent/__preview` route.
- Sibling of N134 (start-point toggle) — both from the same `/task-analyze`
  session on flow-chart UX.
- Module forms have no embedded map yet; the `readOnly` capability is in place
  for when one is added.
