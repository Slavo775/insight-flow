# N282 — Hub reliability — listen errors, registry by path, liveness counter, lock probe, versioned service worker

**Type:** fix
**Priority:** medium
**Created:** 2026-10-19

## Problem

Both servers can die silently. On a busy port they exit 1 with nothing on stderr, and file watchers have no error handlers. The dashboard starts its activity engine and the hub integration before `listen` succeeds, so a second instance truncates the first one's activity log.

The hub registry keys projects by folder name: two projects named `web` collapse into one entry, share a token, and "Start" can spawn in the wrong folder. When an old liveness stream closes, the project is marked offline even if its new stream is already open. Port assignment is check-then-use. The lock is PID-only, so a reused PID after a reboot looks like "already running".

The hub service worker caches `/hub-notify.js` forever under a fixed cache name, so notifier fixes never reach users. It can also store any navigated URL as the offline shell.

Smaller issues: `/update` bodies are unvalidated, `Connection:` header tokens are forwarded, the npm version check is not deduped and its body read is unbounded, HTML proxy buffering is unbounded, `/api/register` is unvalidated, and a mid-stream throw leaves the socket open.

Source: `N271/AUDIT.md` **A23, A50, A51, A52** (except `[::1]`, done in N272), **A79** (service-worker part).

## Goal

1. Both servers print a clear message and exit non-zero on a listen error, handle watcher errors, and start side effects only after `listen` succeeds.
2. The registry keeps one entry per project path, and online status matches the live connection.
3. "Is the hub running?" is decided by an HTTP probe, not only a PID.
4. A new package version always delivers the new `hub-notify.js`; the offline shell can't be poisoned.
5. Hub input and proxy paths are bounded and validated.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts`:
  - `MASTER_SW_JS` (~:221-262)
  - `findFreePort` / `assignHubPort` (~:477-491, :1446-1453)
  - proxy HTML buffering and `stripHopByHop` (~:466-471, :637-669)
  - `fetchLatestVersion` (~:748-771)
  - `/api/register` (~:958-961), `/update` (~:1057-1066)
  - liveness (~:1356-1373)
  - catch-all (~:1584-1588), `listen` (~:1591-1593)
- `packages/taskflow/src/master/registry.ts` (`upsert` :32-47, state merge :127-133).
- `packages/taskflow/src/master/lock.ts`, `packages/taskflow/src/master/index.ts`.
- `packages/taskflow/src/core/global-config.ts` (PID liveness consistency ~:24-31).
- `packages/taskflow/src/dashboard/server/index.ts` — process error handlers (~:1553-1571), start order (~:728, :751, :1667), `fs.watch` calls (:184, :197, :222).
- `packages/taskflow/src/dashboard/server/activity.ts` (watcher error handler only).
- Tests.

### Out of scope

- Trust gates, bind address, `[::1]` → N272.
- `ActivityEngine` read logic → N279.
- Hub client UI → N283.

## Implementation plan

1. **Loud listen failures (A50).** Both servers: `server.once("error", …)` inside the listen promise. On `EADDRINUSE` print `port <n> is already in use` to stderr and exit 1, rejecting the promise for in-process callers and tests. Both `uncaughtException` / `unhandledRejection` handlers `console.error` the error before forwarding or logging.
2. **Start order (A50).** In the dashboard, start the activity engine, hub spawn and registration inside the listen callback.
3. **Watcher errors (A50).** Every `fs.watch` gets `w.on("error", …)` that closes the watcher, logs once and re-arms (or falls back to polling).
4. **Registry by path (A51a).** `upsert` reconciles by normalized project path first. If the `projectId` is already taken by a different path, assign a suffixed `projectId` (`web-2`). Never share a token across paths. `/api/projects/create` must not re-point an existing entry's path.
5. **Liveness counter (A51b).** Track open live streams per id (or the current response object). Mark offline only when the closing stream is the current one, or the count drops to 0.
6. **Port reservation (A51c).** Keep an in-memory set of ports handed to in-flight starts. Never return a busy port after the scan; fail with a clear error instead. Capture the child's early exit and surface it instead of a 15 s 504.
7. **Lock by probe (A51d).** Decide "running" by `GET http://127.0.0.1:<lock.port>/manifest.webmanifest` answering within 500 ms; the PID is only a hint. Clear the lock in the crash and `SIGHUP` paths. Use the same EPERM semantics in `lock.ts` and `global-config.ts`.
8. **Service worker (A23, A79).** Interpolate the package version into the cache name (`'if-hub-' + version`) at server start. Add `/hub-notify.js` to the bypass list, or make every non-`/assets/` URL network-first. Store into the `'/'` key only when the response is `text/html` for a known shell path (`/`, `/overview`, `/logs`).
9. **Bounded inputs and proxy (A52).**
   - Small zod schema for `/update` (reject non-object bodies; validate `claudeStatus` against `VALID_STATUSES`).
   - `stripHopByHop` also deletes the tokens listed in `Connection`.
   - `fetchLatestVersion`: cache the in-flight promise, clear the abort timer only after the body is read, add a 5-minute negative cache.
   - Cap buffered HTML at 2 MB (stream unmodified beyond that) and rewrite only the shell route.
   - `/api/register`: validate `url` with `isLoopbackUrl` and cap `label` / `projectId` lengths.
   - Catch-all: if headers were already sent, `res.destroy()` and `recordLog` the error.
10. **Tests.**
    - Busy port → stderr message, non-zero exit, rejected promise.
    - Two projects with the same folder name → two entries, different tokens.
    - Reregister then old-stream close → stays online.
    - Stale lock with a reused PID → the hub starts.
    - The SW source contains the package version and bypasses `/hub-notify.js`.
    - `/update` with a non-object body → 400.
    - `Connection: x-foo` is not forwarded.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new tests (`master-liveness` and `master-boot` unchanged and green).
- Manual: `nc -l 6006 &` then `insight-flow ui` → prints "port 6006 is already in use" and exits 1.
- Manual: two playground copies named the same both appear in the hub and start in their own folders.
- Manual: after a version bump, the hub serves the new `hub-notify.js` without clearing site data (DevTools → Application → Cache Storage shows the new cache name).

## Notes

- Detail and evidence: `N271/AUDIT.md` A23, A50–A52, A79. The SW cache name `'if-hub-v3'` was last bumped in N220, before `hub-notify` existed (N238).
- **Depends on N272** (same files, trust helpers moved to core).
- Coordinate with N284, which also edits `dashboard/server/index.ts` (different regions).
- Recommended run: `/task-analyze N282` → `/task-implement N282`.
