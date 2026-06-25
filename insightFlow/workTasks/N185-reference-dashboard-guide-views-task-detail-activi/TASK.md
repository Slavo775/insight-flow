# N185 — Reference: dashboard guide (views, task detail, activity feed) + screenshots

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- The dashboard is insight-flow's headline visual feature (a React + Vite app), but the docs site has **zero** dashboard documentation and **zero** screenshots (`website/static/img` is empty). New users can't see what they get, and there's no guide to the 5 views or the task-detail page. This is the last content task in the documentation program and the one that adds visuals.

## Goal

1. A dashboard guide documenting the 5 main views + the task-detail page + the activity feed.
2. Real **screenshots** of the dashboard on the guide and (at least one) on the Overview/Get Started pages.
3. Done last so it can link back to Concepts (N182), Reference (N183), and Guides (N184).

## Scope

### In scope

- Author a dashboard guide. Placement: a `dashboard/` group under the consumer Reference area (or a single `dashboard.md` if it stays small). Suggested coverage (one section or page each):
  1. **Overview / Kanban** — the landing board: shard nav, stats, columns derived from the bound flow's statuses (N129), settings popover (notifications/sound).
  2. **Task detail** — the per-task deep-dive: metadata, status history, reviews, incidents, implementation details (the `TaskDetailPage`).
  3. **Agents browser** — the composed-agent browser: an agent's modules + artifacts (`AgentsPage`/`AgentDetail`).
  4. **Modules browser** — the module registry browser (`ModulesPage`/`ModuleDetail`), incl. the composition map.
  5. **Flow / Project editor** — the project/flow view: agents, flow graph, statuses, entry agents, install list (`ProjectPage`/`ProjectForm`).
  6. **Activity feed** — live `ClaudeStatus` (active/idle/awaiting-permission/done) + the event timeline, fed by SSE.
- **Screenshots:** capture the dashboard against the playground sandbox (`pnpm play` → http://localhost:6006 or `insight-flow ui`), save under `website/static/img/dashboard/`, and embed them in the guide. Add at least one hero screenshot to `get-started/overview.md`.
- Cross-link to Concepts (N182) for the model behind the Agents/Modules/Flow views.

### Out of scope

- Documenting the dashboard's internal React implementation (it's a UI guide, not an internals doc).
- The composition *model* (N182), default *inventory* (N183), authoring *how-tos* (N184) — link, don't duplicate.
- Any change to dashboard source code.
- A full interactive product tour / video.

## Implementation plan

1. **Enumerate views from `src/dashboard/client/`** (App.tsx routes + the page components) to confirm the current view set and names.
2. **Run the dashboard** against the playground (`pnpm play`, or `insight-flow ui` in a seeded project) so there's real data to capture.
3. **Capture screenshots** of each view + the task-detail page + activity feed; save to `website/static/img/dashboard/` (reasonable size; consistent theme).
4. **Write the guide** — one section/page per view, each with its screenshot and what the view is for.
5. **Add a hero screenshot** to Overview (and/or Getting Started).
6. **Build** — `pnpm --dir website build` clean; confirm images resolve and render.

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings (and no broken image refs).
- Screenshots exist under `website/static/img/dashboard/` and render in the built guide + Overview.
- View names/descriptions match `src/dashboard/client/` (App.tsx routes).
- `npx prettier --check` passes on new markdown.

## Notes

- Program order: N181 ✅ → N182 (Concepts) → N183 (Reference) → N184 (Guides) → **N185 (Dashboard, this — last)**.
- Closes the "zero visuals for a visual product" gap identified during analysis.
- Views (from analysis): DashboardView/Kanban, TaskDetailPage, AgentsPage, ModulesPage, ProjectPage, ActivityFeed; state via Zustand (`useDashboardStore`) + SSE (`useDashboardStream`).
- Screenshots should use the playground sandbox so no real project data leaks.
