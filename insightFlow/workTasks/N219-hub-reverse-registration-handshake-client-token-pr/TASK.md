# N219 — Hub reverse-registration handshake + client token privacy

**Type:** feat
**Priority:** high
**Created:** 2026-07-11

## Problem

Two issues in the master hub. (1) The per-project auth `token` leaks to the browser: the master serializes the full registry entry (which includes `token`) into the overview page data, the `GET /api/hub/projects` response, and every `project-update` SSE frame. (2) The master-start "handshake" added in N218 only GETs each project's `/health` and marks the card online (`registry.markUp`) without any real key exchange, and there is no way for a project to decline. We want the true reverse handshake from the design diagrams: on boot the master asks each project to register itself; the project performs a real `/api/register` (getting a fresh key) or declines.

## Goal

1. The per-project `token` never reaches any client surface (page data, hub API, SSE frames).
2. On master start/restart, the master triggers each registered project to re-register (Diagram 1); the project does a real `/api/register` and gets a fresh key.
3. A project can decline the handshake (prepare for the future refuse-to-register case).
4. The `markUp` fake-online path is removed — online state comes only from real registration + the liveness channel.
5. Build, typecheck, and tests are green, with new coverage for token privacy and the handshake.

## Scope

### In scope

- `packages/taskflow/src/master/registry.ts` — add a client-safe projection (e.g. `toPublicView` / `getAllPublic`) returning only `id, projectId, label, online, lastSeenAt, state`; remove the now-unused `markUp`.
- `packages/taskflow/src/master/server.ts` — use the public projection at the three client sinks: `getOverviewHtml(...)` (line ~843), `GET /api/hub/projects` (line ~650), and every `broadcast("project-update", entry)` (lines ~487, 518, 567, 674, 687, 718). The proxy keeps resolving the real `url` server-side via `registry.getById` (unchanged).
- `packages/taskflow/src/master/index.ts` — replace `handshakeRegistered`: instead of GET `/health` + `markUp`, `POST http://localhost:<port>/hub/reregister` for each hub project (short timeout). No response / non-2xx → do nothing.
- `packages/taskflow/src/dashboard/server/index.ts` — add a localhost-only `POST /hub/reregister` endpoint that invokes the existing `reregister()` closure and returns `{ ok: true }`, or `{ declined: true }` when the project is configured standalone. Expose `reregister` from `setupMasterIntegration` to the request dispatch (module-level ref).
- `packages/taskflow/src/master/types.ts` — optional `PublicProjectEntry` type for the projection.
- Tests in `packages/taskflow/test/master-liveness.test.mjs`.

### Out of scope

- The proxy URL path (`/p/<id>` → `/project/<projectId>`) and the running/stopped UI split — that is N220.
- Any New Project changes (N221 / N222).
- Changing the `/api/hub/live` or `/health` token semantics beyond what privacy requires.

## Implementation plan

1. **Public projection (registry.ts).** Add `toPublicView(entry)` → `{ id, projectId, label, online, lastSeenAt, state }` and `getAllPublic()`. Delete `markUp` (added in N218) since the real handshake replaces it.
2. **Stop leaking token (server.ts).** Feed `getOverviewHtml` and `GET /api/hub/projects` from `getAllPublic()`; wrap every `broadcast("project-update", …)` in `toPublicView(entry)`. Leave proxy resolution using the full entry server-side.
3. **Project re-register endpoint (dashboard/server/index.ts).** In `dispatch`, add `POST /hub/reregister` gated to loopback (`127.0.0.1`/`::1`/`::ffff:127.0.0.1`). Call the stored `reregister` closure; return `{ ok: true }`. If `config.master?.standalone`, return `{ declined: true }` with 200. Store the `reregister` reference where `dispatch` can read it (a module-level `let`).
4. **Master boot trigger (master/index.ts).** Rewrite `handshakeRegistered(hubProjects)` to `POST` `http://localhost:${p.port}/hub/reregister` for each project with a ~1.5s AbortController timeout; ignore failures. The project re-registers itself against the master, which sets its url + online via the normal register + `/api/hub/live` path.
5. **Verify no client reads token/url.** Confirm `overview.ts` only uses `p.id`, `p.online`, `p.label`, `p.state` (it does today) so the slimmer shape is safe.
6. **Tests.** (a) `GET /api/hub/projects` and the overview HTML contain no `token`. (b) A stub project exposing `POST /hub/reregister` that calls `/api/register` is adopted after a simulated boot; a project that returns `{ declined: true }` is not force-onlined.

## Verification

- `curl -s localhost:6100/api/hub/projects | grep -c token` → `0`; overview HTML has no `token`.
- Start a project dashboard, restart the master → the project comes back online via a real re-register (server log shows `/api/register`, not a fabricated mark).
- `cd packages/taskflow && npx tsc --noEmit && npm test` green.

## Notes

- Related: N212 (proxy), N214 (token + liveness), N218 (markUp probe this replaces).
- Diagram 2 (project starts after master) already works via `registerWithMaster` + `holdLiveness` 401 → `reregister`. This task adds Diagram 1 (master starts, triggers projects) and closes the token leak.
- Foundation for N220–N222; do this first.
