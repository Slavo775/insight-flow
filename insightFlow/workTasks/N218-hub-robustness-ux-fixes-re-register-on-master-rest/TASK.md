# N218 — Hub robustness + UX fixes: re-register on master restart, reliable Start, proxy error page, consistent Start button

**Type:** fix
**Priority:** high
**Created:** 2026-07-11

## Problem

Live-testing the PWA hub (N212–N217) surfaced real bugs:

1. **A master restart orphans running projects.** A dashboard registers + holds a liveness channel once at boot. When the master restarts (fresh in-memory registry, new ids/tokens seeded from `hub.json`), the running dashboard's liveness reconnect presents its **old** token → the new master `401`s it → `holdLiveness` just retries forever with the dead token. It never re-registers, so alive projects show **offline** ("0 live" even though `:6007`–`:6009` are serving).
2. **Start reports success without a real connection.** `POST /api/hub/projects/:id/start` waits until the port is *reachable*, then the client routes to `/p/<id>/`. But if the project didn't (re-)register — or a stale/foreign server holds the assigned port — the entry has no `url`, so the proxy returns raw `{"error":"No registered project '…'"}`. Assigned ports also aren't OS-checked (N213 NB), so they can collide.
3. **Proxy failures show raw JSON**, not a friendly page.
4. **The Start control is styled inconsistently** — a blue link that turns into a gray boxy "Starting…" — the user wants a proper button consistent with the rest of the UI.

## Goal

1. A running dashboard **re-registers** when the master doesn't recognize it (liveness/update `401`), so a master restart brings projects back online automatically.
2. **Start is reliable:** it waits for the project to be genuinely **online** (registered), uses a truly free port, and returns a real error the UI shows if it can't.
3. `/p/<id>/*` failures (unknown/offline project, unreachable upstream) render a **friendly HTML error page** with a link back to the hub — not raw JSON — for navigations.
4. The **Start button** (and its "Starting…" state) is a consistent button matching the hub's other buttons.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — `holdLiveness`: on a `401`/unauthorized liveness response, **re-register** (new id+token) and reconnect; keep the existing `update`-401 re-register path aligned.
- `packages/taskflow/src/master/server.ts` — the `/api/hub/projects/:id/start` handler (wait for `online`, OS-free port via a helper, clearer failure), and the `/p/<id>/*` proxy 404/502 responses → HTML page for `Accept: text/html`/navigations (JSON otherwise). A small shared error-page helper.
- `packages/taskflow/src/core/global-config.ts` or `master/server.ts` — an OS free-port check when assigning/using a start port (build on `assignHubPort`).
- `packages/taskflow/src/master/overview.ts` — `openControlHtml` / `.start-btn` styling so Start + Starting… are a consistent button (reuse the button style; keep the sanitized-id onclick).

### Out of scope

- Re-architecting the registry id model (ephemeral seed ids stay; re-register + path reconcile cover it).
- Web Push, new PWA features, the proxied dashboards' internals.
- The machine-local stray on `:6100` (environmental, not our code).

## Implementation plan

1. **Re-register on master-unknown (Bug A).** In `holdLiveness`, detect a `401` (or non-200) liveness response and, instead of retrying the dead token, call the register flow again (new `{id, token}`), update `masterId`/`masterToken`, then reconnect liveness. Guard against loops (backoff; stop if superseded).
2. **Reliable Start (Bug B).** In the start handler: pick a port that is actually free (OS check; fall back from the hub port if busy); spawn; then wait for the entry to become **`online`** (not just reachable) within a timeout; return `{ url }` on success or a real `4xx/5xx` error the client surfaces. The client `startProject` already alerts on no-url — keep that.
3. **Proxy error page (ask 3).** Add an HTML error-page helper; in the `/p/<id>/*` handler, when the project is unknown/urlless or the upstream is unreachable, return that page (styled like the hub, with "← Back to hub") for `text/html` navigations; keep JSON for non-HTML/API callers.
4. **Consistent Start button (ask 4).** Restyle `.start-btn` (and the "Starting…" disabled state) to match the hub's buttons; keep `openControlHtml`'s sanitized-id onclick.
5. **Tests.** Extend `master-liveness.test.mjs`: `/p/<unknown>/` with `Accept: text/html` → HTML error page (200/404 with an HTML body + hub link); start still 400s an unknown project. (Re-register + online-wait are integration-heavy; cover what's unit-testable + verify by E2E.)
6. **Verify** end-to-end against the running hub: restart master → running projects come back online; Start an offline project → it opens; a bad `/p/<id>/` → friendly page.

## Verification

- Restart the master while a project dashboard is running → within a few seconds it shows **online** again (re-registered).
- `curl -H 'Accept: text/html' http://localhost:<master>/p/bogus/` → an HTML error page with a back-to-hub link (not raw JSON); `curl` without the header → JSON (unchanged).
- Start button + Starting… render as a consistent button.
- Build ✅ · tests green · typecheck ✅.

## Notes

- Follow-ups on the just-built hub (N212–N217), on `dashboard-improvements` — land **before** releasing 2.4.0.
- Root causes: N214 liveness reconnect didn't handle a re-keyed master; N215 start trusted "reachable" over "online"; N213 NB (assignHubPort not OS-checked) now bites. See those tasks.
