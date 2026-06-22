# N163 — Directional left-to-right flow layout + visible relationships — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- Symptom: relationships in the React Flow graphs (module / agent / project views, e.g. `/module/security`) are hard to read and don't convey direction.
- Desired: on a detail view the **subject node** (the module/agent itself, e.g. `security.md`) sits on the **left**; all consuming/other agents sit on the **right**; **inputs render on left handles, outputs on right handles** — a left-to-right dataflow reading order. Edges should be more visibly distinct.
- Cause: `FlowMap.computePositions` (`components/FlowMap.tsx`) does a BFS grid auto-layout (`COL_W`/`ROW_H`) with stored hand-layout winning; the composition maps in `ModuleDetail`/`AgentDetail` don't pin the subject or enforce LTR direction, and edge styling is low-contrast.

## Goal

1. Deterministic left-to-right layered layout: subject pinned left, consumers ranked into columns to the right.
2. Inputs on left-side handles, outputs on right-side handles.
3. More legible relationships (arrowheads, edge labels/colours, hover emphasis) across module, agent, and project graphs.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Custom LTR layered layout (rank by distance from subject) + left/right handles | No new dep, deterministic, fits existing computePositions | Hand-rolled ranking | M |
| B — Adopt dagre/elk layout lib | Robust layered layouts | New dependency, bundle weight | M–L |
| C — Manual positioning only | Simple | Doesn't satisfy "more visible by default" | S |

## Decision

- Chosen option: **A** (option to seed with dagre later if ranking gets complex).
- Rationale: builds on the existing `computePositions` fallback; keeps the bundle lean; gives the directional reading order the user asked for.

## Open questions

- `[non-blocking]` Applies to all three views (module / agent / project)? User said "all other modules and all other agents and project" → yes. Confirm shared layout helper vs per-view.
- `[non-blocking]` Stored hand-layout should still override the new auto-layout (new layout is the fallback only).

## Sources

- None external — grounded in `components/FlowMap.tsx`, `ModuleDetail.tsx`, `AgentDetail.tsx`, `ProjectPage.tsx`; reference URL `/module/security` (user's local instance).

## Handoff brief

- Title: Directional left-to-right flow layout with subject node left, consumers right, visible relationships · type: feat · priority: medium. In the module/agent/project React Flow views, pin the subject node left and rank consumers into right-hand columns, put inputs on left handles and outputs on right handles, and raise edge legibility. Builds on `FlowMap.computePositions`.
