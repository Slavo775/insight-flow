# N163 — Directional left-to-right flow layout with subject node left, consumers right, visible relationships

**Type:** feat
**Priority:** medium
**Created:** 2026-06-22

## Problem

Relationships in the React Flow graphs (module/agent/project, e.g. `/module/security`) are hard to read and don't convey direction. The subject node should sit left, consuming/other agents right, with inputs on left handles and outputs on right handles — a left-to-right dataflow reading order — and edges should be more legible.

## Goal

1. Deterministic left-to-right layered layout: subject pinned left, consumers ranked into right-hand columns.
2. Inputs render on left-side handles, outputs on right-side handles.
3. Edges are more legible (arrowheads, hover emphasis, optional labels/colour).
4. Applies across module, agent, and project graphs.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` — `computePositions` LTR ranking; handle placement.
- `ModuleDetail.tsx`, `AgentDetail.tsx`, `ProjectPage.tsx` composition maps — adopt the directional layout + handle sides + edge styling.

### Out of scope

- Adding a layout dependency (dagre/elk) unless ranking proves insufficient — keep hand-rolled for now.
- Overriding stored hand-arranged layouts (those still win; new layout is the fallback).

## Implementation plan

1. **Rank nodes from the subject** — in `computePositions`, compute BFS distance from the subject node and place it in column 0, consumers in columns 1..n (left→right).
2. **Handle sides** — set input handles to `Position.Left`, output handles to `Position.Right` on the node renderer.
3. **Edge legibility** — add arrowheads/markerEnd, hover highlight, and reuse the N150 relation legend styling for status-change vs handover edges.
4. **Apply to all three views** — factor a shared layout helper so module/agent/project graphs share behaviour.
5. **Preserve hand-layout precedence** — keep `project.layout?.[a]` winning over the computed fallback.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds.
- Manual: `pnpm play` → `/module/security` shows `security.md` left, consumers right, inputs-left/outputs-right; repeat for an agent and a project graph.

## Notes

- BFS grid layout already exists in `FlowMap.computePositions` (`COL_W`/`ROW_H`). Entry agents render with a ★ (N134). Parallel-safe with N162, N168.
