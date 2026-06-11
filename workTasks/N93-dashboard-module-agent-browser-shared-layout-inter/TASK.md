# N93 — Dashboard module & agent browser — shared layout + interactive composition maps

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11
**Modified:** 2026-06-11

## Problem

- The composer registry (60+ modules, 9 composed agents, heterogeneous N92 kinds) is invisible — the only way to inspect what an agent is composed of, or what a module contributes, is reading JSON in the repo. Round 5 of the composer roadmap calls for a dashboard surface; this round delivers the read-only browser with interactive composition maps (the editor comes later).

## Goal

1. Shared two-pane layout (left sidebar menu, right content) as a reusable component for dashboard pages.
2. `/module` + `/module/:id` — sidebar lists all registry modules grouped (shared / role-scoped / integration); content shows the full module record (kind-specific: section heading+body, include ref, MCP name+config, hook event/matcher/command, skill name+content) plus referencing agents, with an interactive map view.
3. `/agent` + `/agent/:id` — sidebar lists the composed agents; content is an interactive React Flow map of the agent's ordered composition (pretty titles); module nodes navigate to `/module/:id`.
4. `/api/agents` + `/api/modules` server endpoints exposing `COMPOSED_AGENTS` + `MODULE_REGISTRY`.
5. **Mobile-accessible** (change request 2026-06-11): on small viewports the sidebar collapses into a hamburger menu opening a fullscreen overlay; the content pane (detail panels and the composition maps) remains usable on mobile.
6. Existing dashboard pages (kanban / timeline / task detail) unchanged.

## Scope

### In scope

- `packages/taskflow/package.json` — add `@xyflow/react` (human-approved 2026-06-11; the one allowed dependency).
- `packages/taskflow/src/dashboard/server/index.ts` — `GET /api/modules` (registry values + per-module `referencedBy` agent ids) and `GET /api/agents` (composed defs + resolved module titles/kinds for map labels).
- `packages/taskflow/src/dashboard/client/` — new: `components/SideLayout.tsx` (shared sidebar+content shell), `ModulesPage.tsx`, `ModuleDetail.tsx`, `AgentsPage.tsx`, `AgentDetail.tsx`, `components/CompositionMap.tsx` (React Flow wrapper used by both details); routes wired in `App.tsx`/`main.tsx` (react-router 6); styling via existing `theme.ts` + styled-components; data fetch via existing `api.ts` patterns.
- `packages/taskflow/src/dashboard/client/api.ts` — typed fetchers for the two endpoints.
- Navigation entry point(s) from the existing dashboard chrome to `/agent` and `/module`.

### Out of scope

- Any editing/composing from the UI (drag-and-drop agent editor = later round); no write endpoints.
- Project-local `--def` agents and consumer-project registries — built-in registry only this round.
- Changes to composer/emitter/schema (`src/agents/`, `src/core/schema/`) beyond importing them in the server.
- Redesign of existing pages; SPA fallback only as far as the new routes need it.

## Implementation plan

1. **API endpoints** (`server/index.ts`) — import `MODULE_REGISTRY` / `COMPOSED_AGENTS`; `/api/modules` returns `{ modules: AgentModule[], referencedBy: Record<moduleId, agentId[]> }`; `/api/agents` returns `{ agents: { id, title, modules: { id, title, kind }[] }[] }`. Ensure the server's SPA fallback serves index.html for `/module/*` and `/agent/*`.
2. **Shared layout** — `SideLayout` (sidebar slot + content slot, styled-components, theme-consistent; active item highlight via `NavLink`). **Responsive**: below a theme breakpoint (~768px) the sidebar is hidden behind a hamburger button in the layout header; tapping it opens a fullscreen overlay menu (same sidebar content, large touch targets, close button + close-on-navigate); content takes full width.
3. **Modules pages** — sidebar groups: Shared (flat ids), per-role (`<role>/…`), Integrations (`testing/…`); `/module` redirects to the first module. Detail content: title, id, kind badge, source, kind-specific panels (body rendered as markdown-ish pre, JSON viewer for MCP config, hook table, skill content block), "Referenced by" agent chips linking to `/agent/:id`.
4. **Agents pages** — sidebar lists 9 agents with pretty titles; `/agent` redirects to first. Detail: header (title, id, module count) + `CompositionMap`.
5. **CompositionMap (React Flow)** — nodes = ordered modules (kind-colored, numbered by sequence position) flowing into the agent node; pan/zoom + minimap; `onNodeClick` → `navigate("/module/<id>")`. Module-detail variant: center module node, edges to its contribution facets and referencing agents. **Mobile**: map container sized to the viewport (no horizontal page scroll), touch pan/pinch-zoom enabled (React Flow supports touch out of the box), `fitView` on load, minimap hidden on small screens; detail panels stack vertically and wrap long content (pre/code blocks scroll within their box).
6. **Wire routes + nav** — `Routes` entries for the four paths; add "Agents" / "Modules" links to the existing dashboard header/nav.
7. **Build + smoke** — `pnpm build` (Vite bundle), playground `insight-flow ui` manual check: navigate menu, click module nodes, verify existing kanban/task-detail untouched.

## Verification

- `pnpm build` green (Vite + tsc); `pnpm --filter insight-flow test` green (no server test regressions).
- Playground: `/agent/task-implement` renders the map with 11 ordered module nodes; clicking `minimal-diff` lands on `/module/minimal-diff` showing body + "referenced by" implement/review-fix/incident; `/module/testing/hook` shows event/matcher/command (note: module ids contain `/` — route must match nested segments, e.g. `path="module/*"` with splat parsing).
- Mobile (narrow viewport / devtools device emulation ~375px): hamburger visible, overlay menu opens fullscreen and closes on selection; module detail readable without horizontal page scroll; agent map pannable/zoomable by touch with `fitView` on load.
- Existing routes (`/`, task detail) behave exactly as before.

## Notes

- Round 5a of the composer line (N88 → N89 → N90 → N91 → N92 → **N93**). The full agent-creator editor (drag-and-drop over the same map) is the follow-up round — React Flow chosen partly because it carries that future.
- Gotcha: role-scoped/integration module ids contain `/` (`task-implement/never`) — react-router params won't match them with `:id`; use a splat route (`/module/*`) and decode the remainder. Same for the API path or use a query param.
- `@xyflow/react` approved by the human 2026-06-11 (AskUserQuestion record in session; also stated in ANALYSIS.md).
- Dashboard CLAUDE.md description is stale (says server-rendered HTML) — the real stack is the N85–N87 React app; do not "restore" the old approach.
