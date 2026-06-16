# N135 — Analysis (pre-taskmaster strategist)

## Problem framing

The human asked that "click to detail" stop working while in edit or create mode
— for flows, flow agents, and modules. Tracing the maps:

- **Flow:** already covered — edit mode swaps the read-only `FlowMap` for
  `FlowEditor`, whose node click opens a popover instead of navigating.
- **Agents:** confirmed bug — `AgentForm.tsx:357` embeds a live `CompositionMap`
  preview with **no** click override, so a node click runs the default
  `navigate()` (`CompositionMap.tsx:164`), leaving the form and discarding
  unsaved input; the preview agent node id `agent:__preview` even routes to the
  dead `/agent/__preview`.
- **Modules:** `ModuleForm` has **no** embedded map today (only the read-only
  `ModuleDetail.tsx:372` does), so there is no module edit/create map to disable
  yet.

Human confirmed: apply the no-navigate rule to edit & create surfaces of all
flow charts.

## Goal

Node clicks inside any edit/create map never navigate away / discard work. Fix
the live `AgentForm` bug; keep read-only detail-map navigation intact.

## Options considered

1. **`readOnly` (suppress-navigation) prop on the shared maps + wire into every
   edit/create embedding** (CHOSEN) — one reusable capability on
   `CompositionMap` and `FlowMap`; applied where maps live in edit/create.
2. Per-call `onNodeClick` override only — narrower, but leaves the default
   `navigate()` as a foot-gun for the next embedder.
3. For the AgentForm preview specifically: **open the in-place `ModuleInfoModal`
   instead of navigating** (PREFERRED behavior) vs fully-inert clicks. The modal
   is non-destructive and matches read-only `AgentDetail` (`onModuleClick`).

## Decision

Add `readOnly?: boolean` to `CompositionMap` (and `FlowMap` for symmetry). In
`AgentForm`, prefer wiring `onModuleClick` to a `ModuleInfoModal` (inert clicks
acceptable fallback) so the preview never navigates and `agent:__preview` can't
fire. Read-only detail pages unchanged. Module forms gain nothing visible today
(no map) — capability is forward-looking. Client-only.

## Open questions

- AgentForm preview: modal (preferred) vs fully inert — implementer's call,
  modal favored.
- Whether to add `readOnly` to `FlowMap` now (yes, for symmetry) even though
  flow edit already swaps to `FlowEditor`.

## Sources

- `packages/taskflow/src/dashboard/client/components/CompositionMap.tsx:164`
- `packages/taskflow/src/dashboard/client/AgentForm.tsx:357`
- `packages/taskflow/src/dashboard/client/AgentDetail.tsx:55,105` (modal pattern)
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx`,
  `FlowEditor.tsx`, `ModuleDetail.tsx:372`

## Handoff brief

fix / medium / tags: dashboard, maps, ux. Add a `readOnly` suppress-navigation
prop to `CompositionMap` (+ `FlowMap`) and apply it in every edit/create map
embedding. Fix `AgentForm.tsx:357` so the preview map stops navigating
(preferred: open `ModuleInfoModal`); guard the dead `/agent/__preview` route.
Read-only detail maps unchanged; module forms have no map yet. Sibling of N134.
