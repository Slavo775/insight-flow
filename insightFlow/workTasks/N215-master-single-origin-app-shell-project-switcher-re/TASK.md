# N215 — Master single-origin app shell: project switcher + reverse-proxy /p/<id> + start-and-go

**Type:** feat
**Priority:** high
**Created:** 2026-07-10

## Problem

Today the master `/overview` is a server-rendered HTML page, and each project dashboard is a separate site on its own port. The roadmap wants **one place** (`master`, e.g. `:6010`): a real app shell with a **project switcher**, where selecting a project shows that project's dashboard **in the same tab** via the reverse-proxy (N212), online projects first, updating live. The user should also be able to **start a stopped project's server from the switcher** and be taken to it.

## Goal

1. Master serves a **React app shell** on its origin: a thin layout (a floating "hub"/overview control) + a **project switcher** (popover/selectbox) listing all registered projects, **online first**, live via SSE/WS.
2. Selecting a project navigates to `/p/<id>/` (reverse-proxy from N212) — the full project dashboard renders **in the same window**, no new tab.
3. **Start-and-go:** for an offline project, a "Start" action makes master spawn its dashboard (like `bulk-ui` spawns children), waits until it's up, then routes to `/p/<id>/`.
4. Overview remains reachable as a standalone view (the floating control / a `/` route), so the PWA (N217) can launch into it.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — serve the new shell app at `/`; keep/adapt `/p/<id>/*` proxy (N212); add `POST /api/hub/projects/:id/start` (spawn `insight-flow ui --port <assigned>` for that project path, like `batch-ui`'s spawn; return when reachable).
- A **master client app** (new, small React or reuse the dashboard client's stack under `master/`): shell layout, project-switcher popover (online-first, live updates over the master `/events` SSE), navigation to `/p/<id>/`.
- `packages/taskflow/src/master/overview.ts` — either fold the overview into the React shell or keep as a view within it.
- Vite build wiring for the master shell app; served by `master/server.ts`.

### Out of scope

- Notifications/sounds unification (N216) and PWA manifest/SW (N217) — separate.
- Rewriting the per-project dashboard internals (it renders as-is through the proxy).
- Auth beyond N214's token.

## Implementation plan

1. **Master shell app.** Add a small React app under `src/master/client/` (mirror the dashboard client's Vite setup): layout + a floating overview/hub button + a project-switcher popover. Build via Vite; serve from `master/server.ts` at `/`.
2. **Switcher data + live.** Fetch registered projects; **on popup open, call the N214 on-demand probe** so the list is fresh; also a manual **refresh** button that re-probes. After that, subscribe to master `/events` SSE for real-time online/offline + state; sort **online first**; show status dot.
3. **Navigate to project.** Selecting a project routes the browser to `/p/<id>/` (N212 proxy). Confirm SSE/assets work through the proxy (from the spike).
4. **Start-and-go.** `POST /api/hub/projects/:id/start` → resolve path + assigned port (N213) → spawn child (reuse `batch-ui` spawn/`findFreePort`) → poll until reachable → respond; client then routes to `/p/<id>/`.
5. **Overview view.** Fold `getOverviewHtml` content into a shell view (or keep server-rendered but reachable within the shell) so the PWA can start there.
6. **Tests.** Start endpoint (spawn + reachable, mockable); switcher renders online-first from a registry snapshot.

## Verification

- Open `http://localhost:<master>/` → shell + switcher listing registered projects (online first).
- Select an online project → its dashboard renders at `/p/<id>/` in the same tab, live updates flow.
- "Start" an offline project → server spawns, then routes to it.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 3** — the big UX piece. **Depends on [[N212]] (proxy spike) and [[N213]]/[[N214]] (registry + liveness).**
- Keep the shell thin: it should not duplicate the per-project dashboard — it hosts + switches it.
- Feeds [[N216]] (single-origin needed for one service worker) and [[N217]] (PWA launches into `/`).
- Port for the hub: propose `:6010` (distinct from `:6006` ui / `:6100` master today) — confirm during implementation.
