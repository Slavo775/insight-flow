# N85 — Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files

**Type:** rework
**Priority:** medium
**Created:** 2026-06-09

## Problem

The project dashboard at `/` is a ~1,500-line server-rendered vanilla-JS string (`packages/taskflow/src/dashboard/server/dashboard.ts`) — hard to maintain and extend as we want a richer UI. It also can't render the per-task generated docs: the existing `GET /api/work-tasks/:file` route (`dashboard/server/index.ts:505`) rejects any path containing `/`, so subfolder docs (`N<XX>-…/TASK.md` etc.) are unreachable.

## Goal

1. Replace the `/` dashboard with a **React + Vite** SPA, built into `dist/dashboard/`, served by the existing `node:http` server on the **same port** (default 6006).
2. **Behavior parity** with today: Kanban / timeline / detail panel / activity, live SSE updates, notification sounds, iframe-safe.
3. Add **pretty markdown rendering** of each task's `TASK/CHECKLIST/REVIEW/ANALYSIS.md` via one new **read-only** endpoint.
4. Stay **read-only & agent-driven** (no UI writes), **one package**, all gates green.

## Scope

### In scope

- React + Vite SPA source under `packages/taskflow/src/dashboard/client/`, built to `dist/dashboard/`. Add `react`, `react-dom`, `vite`, `@vitejs/plugin-react` (+ types) to the package.
- `dashboard/server/index.ts`: serve `dist/dashboard/index.html` at `/` and assets from `/assets/*`; add `.js/.css/.svg/.woff2` to the `MIME` map (currently only `.html/.json/.mp3`). Leave `/api/*`, `/events`, `/config`, `/overview` unchanged.
- Vite dev server proxying `/api` + `/events` → `http://localhost:6006`.
- Parity views: Kanban, timeline, detail panel, activity — consuming `/api/work-tasks*` + `/api/activity`; live updates via a `useEventSource` hook on `/events`; preserve notification sounds; **root-relative asset paths so it works iframed** (embedded in master overview on 6100).
- One new **read-only** endpoint serving a task's `TASK/CHECKLIST/REVIEW/ANALYSIS.md` (whitelisted names + traversal guard). Render with `react-markdown` + `remark-gfm` (tables, `- [ ]`) + `rehype-sanitize`.
- Extend the N82 eslint/prettier config for React/JSX. Build script gains `vite build` alongside `tsup`. Update the N81 `published-surface` + `e2e-smoke` tests so `dist/dashboard/*` ships in the tarball.

### Out of scope

- **Any UI write / drag-drop / lifecycle mutation** — stay agent-driven; dashboard is read/visualize-only. No write endpoints.
- Custom/user-defined states, role-gated transitions, workflow visualization (separate core epic + analysis).
- Agent-module management UI (separate analysis).
- Master overview server (6100), the `/config` page, and the `/overview` iframe wrapper — **stay server-rendered**. This rewrite is `/` only.
- Do not delete `dashboard.ts`'s generator until parity is verified green.

## Implementation plan

1. **Scaffold Vite + React** — add deps; create `vite.config.ts` (root = client dir, `base: "./"` or `/`-relative, `build.outDir = ../../../dist/dashboard`, emit `manifest`). Frontend entry under `src/dashboard/client/`.
2. **Build + serve wiring** — build script → `tsup && vite build && <copy sounds>`. In `index.ts`, serve `dist/dashboard/index.html` at `/` and static `/assets/*` with the new MIME entries; keep all existing API/SSE/config/overview routes.
3. **Dev workflow** — Vite dev server with proxy `{ "/api", "/events" } → localhost:6006`; add a `dev:dashboard` script.
4. **Port views to parity** — recreate Kanban / timeline / detail / activity from `dashboard.ts` as React components; reuse `core` `Task`/`Review` types; re-implement live updates via `useEventSource("/events")`; keep sounds; verify iframe rendering.
5. **Markdown viewer** — add `GET /api/work-tasks/:id/doc?name=TASK|CHECKLIST|REVIEW|ANALYSIS` (whitelist + traversal guard, read-only) returning raw md; render in the detail panel with `react-markdown` + `remark-gfm` + `rehype-sanitize`.
6. **Tooling + tests** — eslint react/jsx; update `published-surface` + `e2e-smoke` to assert `dist/dashboard` assets exist and are served; confirm `pnpm pack:taskflow` includes them.
7. **Cutover** — once parity is verified green, remove the dashboard HTML/JS generator in `dashboard.ts` (keep `getConfigPageHtml`/`getNavHtml`/`getNavCss` — still used by `/config` + `/overview`).

## Verification

- `pnpm --dir packages/taskflow run typecheck` · `lint` · `format:check` green.
- `pnpm --dir packages/taskflow test` green, including updated `published-surface`/`e2e-smoke` proving `dist/dashboard` assets pack + serve.
- Manual: `pnpm play` → `:6006` shows Kanban/timeline/detail/activity, live updates on task change, sounds, renders task markdown; still works **iframed** via master overview (`:6100`); `pnpm pack:taskflow` tarball contains `dist/dashboard/`.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Follow-up to the N81–N84 arc ("lean now, scale deliberately"). React's added weight (build step, `react`/`react-dom`, larger tarball) was accepted **deliberately** for maintainability + richer-UI; Preact and modularize-first were considered and declined.
- Backend stays read-only/agent-driven; `/api/*` + `/events` are already a clean SPA contract — the **only** backend addition is the markdown read endpoint.
- The dashboard delivery mechanism changes — check whether `docs/architecture-diagrams.md` Diagram 2 (server/iframe integration, shard hydration) needs a note per the task-implement gates.
