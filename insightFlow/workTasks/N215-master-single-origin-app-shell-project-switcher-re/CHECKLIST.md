# N215 — Master single-origin app shell: project switcher + reverse-proxy /p/<id> + start-and-go — Checklist

## Done criteria

- [ ] Master serves a React app shell at `/` (layout + floating overview/hub control)
- [ ] Project switcher (popover/selectbox) lists registered projects, **online first**, live via master `/events`
- [ ] Opening the popup calls the N214 on-demand probe (fresh list); a manual **refresh** button re-probes
- [ ] Selecting a project navigates to `/p/<id>/` (N212 proxy) — dashboard renders in the same tab
- [ ] `POST /api/hub/projects/:id/start` spawns an offline project's server and returns when reachable
- [ ] After start, the client routes to `/p/<id>/`
- [ ] Overview reachable as a standalone view (for the PWA start_url)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (master shell Vite build wired)
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] `/` shows shell + switcher (online first); selecting online project renders its dashboard at `/p/<id>/` with live updates
- [ ] "Start" an offline project → spawns → routes to it
