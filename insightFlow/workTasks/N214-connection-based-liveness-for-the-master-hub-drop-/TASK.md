# N214 — Connection-based liveness for the master hub (drop polling) + light per-project token

**Type:** feat
**Priority:** high
**Created:** 2026-07-10

## Problem

The overview / switcher needs to know which registered projects are **online**. We drop the original **10-minute timer poll** (stale + wasteful) and instead use **two complementary signals**: (1) **connection-based liveness** — a project holds a live socket to master; drop = offline instantly (passive, real-time, free); and (2) an **on-demand active healthcheck** — master probes every registered project's `/health` **only when the user asks**: when the switcher popup opens, or on a manual "refresh" click. No background timer. Plus a **light per-project token** so master only tracks registered projects and probes ignore strangers.

## Goal

1. **Connection-based liveness (passive):** a running project holds a persistent live connection to master (long-lived SSE/heartbeat or WS); master marks it **online** while open, **offline** the moment it closes.
2. **On-demand active healthcheck:** master can probe **all** registered projects' `/health` concurrently and return/broadcast fresh status — triggered **only** by the switcher popup opening or a manual "refresh" (endpoint here; the triggers live in N215). **No background timer.**
3. A project-side lightweight `GET /health` endpoint that returns `200` + a small status payload (validates the token).
4. A **light token**: master issues a per-project token at register; the project echoes it on `update`/`status`/the liveness channel, and master sends it on `/health` probes; missing/wrong token → ignored/`401`. No heavyweight handshake.
5. Master logs `lastSeenAt` / online transitions to its in-memory cache.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` + `registry.ts` — a liveness endpoint (`GET /api/hub/live?id=&token=` SSE, or a WS) that keeps the project marked online while open; `req.on("close")` → mark offline + broadcast `project-update`.
- **On-demand probe endpoint** on master (e.g. `POST /api/hub/refresh` / `GET /api/hub/probe`) — probe all registered projects' `/health` concurrently (short timeout), update the registry, broadcast the fresh snapshot. Called on demand only.
- `packages/taskflow/src/dashboard/server/index.ts` — (a) on boot, after register, open + hold the liveness connection (reconnect with backoff); include the token on `register`/`update`/`status`; (b) add a lightweight `GET /health` route returning `200` + status (validates the token).
- Token issue + verify: master returns `{ id, token }` from register; store per entry; verify on subsequent calls + `/health` probes; `401` on mismatch.
- `registry.ts` — `online: boolean` + `lastSeenAt`; online from the open connection (passive) or the last probe (on-demand), never a timer.

### Out of scope

- The persistent membership registry (N213) — this builds on it.
- Proxy/app-shell/switcher (N215); notifications (N216); PWA (N217).
- Any external/OS-level health monitoring.

## Implementation plan

1. **Liveness channel.** Add master `GET /api/hub/live?id&token` (SSE): validate token, mark entry online, hold open, heartbeat comment every ~25s; on `close` mark offline + broadcast.
2. **Project side.** In the dashboard server boot, after `register` returns `{id, token}`, open the liveness channel and hold it; reconnect on drop (capped backoff).
3. **Token.** Master generates a random token at register, stores it on the entry, returns it; project includes it on `update`/`status`/`live`; master rejects wrong/missing token (`401`).
4. **`/health` on the project.** Add a lightweight `GET /health` to the dashboard server → `200` + `{ status, currentTaskId? }`, validating the token.
5. **On-demand probe.** Master endpoint that probes all registered `/health` concurrently (short timeout, e.g. 1–2s), updates the registry (online/offline + `lastSeenAt`), and broadcasts the fresh snapshot. Runs **only** when called (popup-open / manual refresh, wired in N215).
6. **Offline semantics + no timer.** Online derives from the live connection or the last probe; `lastSeenAt` on connect/heartbeat/probe. Ensure **no background timer** loop is added.
7. **Tests.** Token verify (accept/reject); connection open→online, close→offline; probe marks an unreachable registered project offline.

## Verification

- Start a project → **online** in `/overview` within ~1s; kill it → **offline** within ~1s (passive, no wait).
- Trigger the on-demand probe → registered-but-unreachable projects flip to offline; reachable ones confirmed online; no background timer is running.
- A `GET /health` (or `/api/projects/:id/update`) with a wrong/missing token → `401`; correct token → `200`.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 2.** Replaces the user's "10-min healthcheck" with connection liveness (analysis: polling is both stale and unneeded; 10 servers is negligible load regardless).
- Token is hygiene, not a security system — servers are loopback-only (see N210 guard). Don't over-build.
- Depends on [[N213]]; feeds [[N215]] switcher (online-first ordering).
