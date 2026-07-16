# N243 — Debug log instrumentation — error boundaries (client+server) + registration logging (master+project)

**Type:** feat
**Priority:** high
**Created:** 2026-07-16

## Problem

The log engine (N242) exists but nothing feeds it yet. This task **instruments** the master + project servers and clients to emit debug logs: catch crashes (client React errors + server uncaught exceptions) and log the registration handshake, so a real failure (like the notification saga) shows up in `~/.insight-flow/logs/`.

## Goal

1. A React render error in either client is caught and sent to the master as an `error` log (with component stack).
2. Uncaught server exceptions / unhandled rejections on the master AND project servers are logged (not just crash silently).
3. The registration handshake is logged on both sides: project logs start + finished (with its key); master logs received + generated-code (with project name + data).

## Scope

### In scope

- **Client error boundary** — a React `ErrorBoundary` component wrapping the app root in `src/dashboard/client/` and `src/master/client/`; on error, `POST /log { key, log:{ type:"error", message, data:{ componentStack, url } } }`. The project client uses its own key; the master client uses the reserved `"master"` key.
- **Server error boundary** — `process.on("uncaughtException")` / `process.on("unhandledRejection")` handlers in `src/master/server.ts` (master, `recordLog("master", …)`) and `src/dashboard/server/index.ts` (project, POST /log to master with its key). Log + keep the process alive where safe; never swallow silently.
- **Registration logging** — project (`dashboard/server/index.ts`): log `registration start` (before `/api/register`) and `registration finished` (after, with the returned key/id). Master (`master/server.ts` register handler): log `registration received` + `generated code` with the project name + entry data.

### Out of scope

- The store + endpoints (N242 — depends on it).
- The `/logs` page (N244).
- Broad refactors of the registration flow — only add log calls.

## Implementation plan

1. **Client key access.** The project client needs its master key to POST logs — the project already registers with the master; expose the key to the client (via the snapshot/config the client already fetches) or POST through the project server which forwards. Decide the simplest path (likely: the project server forwards client logs → master, so the client posts to its own server, reusing the existing key it already holds).
2. **ErrorBoundary component.** One small shared boundary; mount at each client's root. `componentDidCatch` → send `{type:"error", message: error.message, data:{ componentStack, url: location.href }}`.
3. **Server global handlers.** In master + project server bootstrap: `uncaughtException` / `unhandledRejection` → build a log entry (message + stack) → master via `recordLog`, project via the forward-to-master path. Guard so the handler itself can't loop/crash.
4. **Registration logs.** Add `info` logs at the 4 points (project start/finished, master received/generated), including the key/id + project name/data.
5. **Tests** — a project React error → an `error` log is emitted; a simulated uncaught rejection → logged; registration flow → 4 log entries. Keep tests light (unit where possible).

## Verification

- Throw in a client component → an `error` log with component stack appears in the project's `error.json`.
- Force an unhandled rejection on the master → an `error` log in `logs/master/error.json`; the master stays up.
- Register a project → `registration start/finished` (project) + `registration received/generated` (master) `info` logs appear.
- `pnpm --dir packages/taskflow test` green; typecheck + lint clean.

## Notes

- Depends on **N242** (the store + `POST /log` + `recordLog`). Do N242 first.
- Related: N240 (the master already has a spawn `error` handler — same "don't crash, log it" spirit).
- Decide the client→master log path early (client → own project server → master is likely simplest, reusing the key the project server already has).
