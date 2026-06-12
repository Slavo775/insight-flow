# N93 — Dashboard module & agent browser — shared layout + interactive composition maps — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

The human's brief (verbatim intent): shared layout with left menu + right content reused across pages; `/module/<id>` listing all modules with full settings/data (incl. the N92 MCP/hook/skill payloads); `/agent/<id>` listing agents with an interactive, pretty composition map whose module nodes navigate to module detail; module detail also gets a map. This is Round 5 of the composer roadmap, deliberately reduced to the **read-only browser** (5a) — the registry is now rich enough (60+ modules, heterogeneous kinds) that invisibility is the bottleneck, while the editor is a separate, riskier round.

## Goal

- Browseable registry: every module's full record + reverse references; every agent's ordered composition as an interactive map; shared two-pane layout reusable by future pages.
- Zero disturbance to the existing dashboard.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — React Flow map (chosen) | True pan/zoom/minimap interactivity; minimal custom code; the natural substrate for the future drag-and-drop editor | One new runtime dependency (~50 kB gz) | M |
| B — Custom SVG map, zero deps | No dependency | Pan/zoom/drag hand-rolled or absent; editor round would rewrite it anyway | M (more code, less result) |
| C — Tables/lists only, no map | Smallest | Ignores the explicit "interactive map in a great and pretty way" requirement | S |

## Decision

- Chosen option: **A** — human approved adding `@xyflow/react` via explicit question (AskUserQuestion, 2026-06-11), satisfying the no-new-dependencies-without-approval rule. Read-only scope confirmed by the brief (browse/navigate language only; editor explicitly later).

## Open questions

- [non-blocking] Module ids contain `/` (`task-implement/never`) — router + API must handle nested segments (splat route / query param). Flagged in TASK.md; implementer picks the mechanism.
- [non-blocking] Agent-map layout algorithm: simple ordered column vs dagre-style layering — start simple (ordered flow), React Flow makes later refinement cheap.
- [non-blocking] Where the "Agents/Modules" nav lives in the existing chrome — implementer matches current header patterns.
- [non-blocking] `/api/agents` could embed full module records or just `{id,title,kind}` refs — spec chooses lean refs + the modules endpoint for detail.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `packages/taskflow/src/dashboard/client/` — React 18 + Vite + react-router 6 + styled-components + Zustand stack (N85–N87); `main.tsx` (BrowserRouter), `theme.ts`, `api.ts` patterns.
- `packages/taskflow/src/dashboard/server/index.ts` — hand-rolled `/api/*` routing the new endpoints join.
- `packages/taskflow/src/agents/compose.ts` — `MODULE_REGISTRY` / `COMPOSED_AGENTS` the endpoints expose.
- Human decision record: React Flow over custom SVG (AskUserQuestion, this session).

## Handoff brief

> Title: Dashboard module & agent browser — shared layout + interactive composition maps · Type: feat · Priority: medium · Tags: dashboard, ui, agents, composer.
> Round 5a: shared two-pane layout (sidebar menu + content); `/module(/:id)` grouped module browser showing full kind-specific records (incl. N92 MCP/hook/skill data) + referencing agents; `/agent(/:id)` with an interactive React Flow composition map whose module nodes navigate to module detail; `/api/agents` + `/api/modules` endpoints. New dependency `@xyflow/react` human-approved. Read-only — no editing this round; existing dashboard pages unchanged.
