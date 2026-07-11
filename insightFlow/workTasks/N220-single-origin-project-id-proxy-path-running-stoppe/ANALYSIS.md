# N220 — Single-origin /project/<id> proxy path + running/stopped split — Analysis

**Created:** 2026-07-11
**Author:** task-analyze

## Problem framing

The spec asks the user to "click on a project item and the master should redirect to /project/<project_id> via reverse proxy," and to divide projects into running vs not-running. Today the proxy lives at `/p/<uuid>/` keyed on the ephemeral registry `id` (regenerated on every re-register), so the URL is not stable across master restarts; and the overview only sorts online-first (`displayOrder`) rather than grouping. The real goal is a durable, shareable per-project URL and a clear visual separation of what is running.

## Goal

- Stable `/project/<projectId>/` proxy path; old `/p/<id>/` still resolves (redirect) so nothing in flight breaks.
- Overview split into labeled Running / Stopped sections.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — New `/project/<projectId>` route + 301 from `/p/<id>` | Stable URL; back-compat preserved; minimal client change (base is already generic) | Two routes to maintain briefly | S–M |
| B — Rename `/p/` to `/project/` with no redirect | Simplest code | Breaks open tabs + cached PWA shell + any bookmarks | S |
| C — Keep `/p/<uuid>` but make the UUID stable | No new route | The UUID is the registration identity; pinning it fights the register/reconcile model | M |

## Decision

- Chosen option: **A** (confirmed with the user — "/project/<project_id> with stable slug").
- Rationale: A gives the stable, human-meaningful URL the spec wants without breaking existing clients (the redirect covers cached shells and open tabs). The client is already base-aware via `window.__IF_BASE__`, so only the server prefix + Open links change. B is user-hostile on upgrade; C misuses the identity model.

## Open questions

- `[non-blocking]` Two projects with the same `projectId` (same `config.projectName`)? The registry reconciles by `projectId`/`path`, so collisions already resolve to one entry — the stable path is fine.
- `[non-blocking]` Regrouping cost: re-rendering both sections on each `project-update` is acceptable at this scale (matches the existing full-innerHTML approach); revisit only if animations are added.

## Sources

- None — self-contained (code read: `master/server.ts` proxy + SW, `master/overview.ts`).

## Handoff brief

Title: Single-origin /project/<id> proxy path + running/stopped split · type: feat · priority: medium. Serve the reverse proxy at a stable `/project/<projectId>/` (resolve by `projectId`), redirect the old `/p/<id>/` to it, exclude `/project/*` from the service-worker cache (bump to v3), point card Open links at `/project/<projectId>/`, and render the overview as two labeled Running/Stopped sections. Depends on N219 (public projection exposes `projectId`).
