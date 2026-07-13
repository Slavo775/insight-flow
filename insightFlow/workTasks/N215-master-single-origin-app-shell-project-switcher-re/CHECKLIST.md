# N215 — Master single-origin app shell: project switcher + reverse-proxy /p/<id> + start-and-go — Checklist

> Scope decision (user-approved): the shell is **server-rendered** (the master's overview page doubles as the switcher/launcher) rather than a second React+Vite app — same UX, no second build pipeline. Can be upgraded to React later.

## Done criteria

- [x] Master serves the shell at `/` (and `/overview`) — the overview page is the launcher
- [x] Project switcher: the overview grid lists registered projects **online-first** (`displayOrder`), live via master `/events`; **Refresh** button + refresh-on-load call the N214 `/api/hub/refresh` (on-demand probe)
- [x] Selecting an **online** project → `/p/<id>/` (N212 proxy) opens its dashboard **in the same tab**
- [x] `POST /api/hub/projects/:id/start` spawns an offline project's dashboard (its own `cli.js` via `process.execPath`, loopback-only) and waits until reachable
- [x] After start, the client routes to `/p/<id>/`
- [x] Overview reachable at `/` (standalone view for the PWA start_url, N217)
- [x] **CRITICAL — client base-awareness:** `base.ts` reads the injected `window.__IF_BASE__`; `apiFetch`/`apiUrl` applied to all 18 `api.ts` fetches + the two `EventSource("/sse")` (useDashboardStream, InstallModal). Vite `base:"/"` unchanged → same build works standalone (`/`) and proxied (`/p/<id>/`)
- [x] Bonus: a floating "⌂ Hub" link injected into proxied dashboards (switch project from inside a project view)

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**335/335**, +1)
- [x] typecheck passes

## Verification

- [x] `/` and `/overview` serve the switcher (Refresh + start-and-go present) — live master check + test
- [x] `__IF_BASE__` bundled into the dashboard JS; proxied `/api` + `/sse` resolve under `/p/<id>/`
- [x] `POST /api/hub/projects/<unknown>/start` → 400 (test); loopback-only guard
- [ ] Full in-browser click-through (open online → start offline → switch via Hub) — manual, deferred to human review (needs a browser + running projects)
