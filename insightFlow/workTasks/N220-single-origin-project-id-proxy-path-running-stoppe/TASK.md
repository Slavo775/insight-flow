# N220 — Single-origin /project/<id> proxy path + running/stopped split

**Type:** feat
**Priority:** medium
**Created:** 2026-07-11

## Problem

The hub reverse-proxies a project under `/p/<uuid>/`, where `<uuid>` is the registry entry's ephemeral `id` — it changes every time the project re-registers (e.g. after a master restart), so bookmarks and open tabs break. The spec asks for a stable `/project/<project_id>/` path. Also, the overview only *sorts* cards online-first; the spec wants running and not-running projects visibly **divided** into labeled groups.

## Goal

1. Projects proxy under `/project/<projectId>/` using the stable `projectId` slug (survives master restarts).
2. `/p/<id>/` keeps working (redirects to the canonical `/project/<projectId>/`) so existing tabs and the cached PWA shell don't break.
3. Card "Open" links point at `/project/<projectId>/`.
4. The overview shows two labeled sections — **Running** and **Stopped** — instead of a single sorted grid.
5. Build, typecheck, and tests are green.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — add a proxy match for `^/project/([^/]+)(/.*)?$` resolving by `projectId` (`registry.getAll().find(e => e.projectId === pid) ?? registry.getById(pid)`); pass the matched prefix into `proxyToProject` so `<base>`/`__IF_BASE__` inject `/project/<id>/`. Keep the `/p/<id>` match but 301-redirect to the canonical `/project/<projectId>/`. Update the service worker (`MASTER_SW_JS`) to also never cache `/project/*` (add to the exclusion alongside `/p/`, `/api/`, `/events`); bump `CACHE` to `if-hub-v3`.
- `packages/taskflow/src/master/overview.ts` — `openControlHtml` Open link → `/project/<projectId>/`; `renderAll` splits `PROJECTS` into online/offline and renders a `Running` section and a `Stopped` section (each hidden when empty). `upsertProject` / SSE handler re-groups (simplest: re-render both sections on update).
- Tests in `packages/taskflow/test/master-liveness.test.mjs`.

### Out of scope

- Token privacy + handshake (N219 — do that first; this builds on the public projection which already carries `projectId`).
- New Project modal / install options (N221 / N222).
- Client `base.ts` / `main.tsx` — already base-generic (they read `window.__IF_BASE__`), so no change needed.

## Implementation plan

1. **Stable proxy route (server.ts).** Add the `/project/<projectId>` regex before the existing `/p/` block. Resolve by `projectId` first, then `id`. Call `proxyToProject(entry.url, "/project/" + encodeURIComponent(entry.projectId), rest, req, res)`.
2. **Back-compat redirect.** Keep the `/p/<id>` match: look up the entry, and if found issue `301` to `/project/<projectId>/ + rest`; if not found, keep the existing friendly 404/JSON behavior.
3. **Service worker (server.ts).** In the fetch handler, add `url.pathname.indexOf('/project/') === 0` to the never-cache guard. Bump `CACHE` `if-hub-v2` → `if-hub-v3` so old clients drop the stale shell.
4. **Open links (overview.ts).** In `openControlHtml`, online → `<a href="/project/<projectId>/" class="card-btn">Open →</a>` using `encodeURIComponent(p.projectId)`. `startProject` success → navigate to `/project/<projectId>/`.
5. **Running/stopped split (overview.ts).** Replace the single `#grid` render: build `online = PROJECTS.filter(p => p.online)` and `offline = the rest`; render `<section>` blocks with headers "Running (n)" and "Stopped (n)", each containing the cards; hide an empty section. Re-render on `project-update` and on the 30s stale sweep.
6. **Tests.** `/project/<projectId>/` proxies to the project; `/p/<id>` returns 301 to the canonical path; overview HTML contains the `Running`/`Stopped` section markers.

## Verification

- `curl -sI localhost:6100/p/<uuid>/` → `301` to `/project/<projectId>/`.
- `curl -s localhost:6100/project/<projectId>/` → the project shell (assets rewritten to `/project/<projectId>/assets/`).
- Overview shows two labeled groups; starting a project moves its card from Stopped → Running.
- `cd packages/taskflow && npx tsc --noEmit && npm test` green.

## Notes

- Depends on N219 (public projection exposes `projectId` to the client — the Open link needs it).
- `projectId` is the stable slug/name a project registers with (`config.projectName`); `id` is the per-registration UUID. Using `projectId` in the URL is what makes the path stable.
- Keep the floating "⌂ Hub" back link (absolute `href="/"`) working under the new prefix.
