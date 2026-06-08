# N83 — Replace socket.io with a native WebSocket/SSE transport behind the Transport seam

**Type:** rework
**Priority:** high
**Created:** 2026-06-08

## Problem

The dashboard's realtime layer depends on **`socket.io`** (server + the `/socket.io/socket.io.js` client lib) — the heaviest dependency in the package, at odds with the "lightweight" goal and blocking a lean React backend. N81 added a `Transport` seam (`packages/taskflow/src/dashboard/server/transport.ts`) precisely to make this swappable; this task realizes the swap.

## Goal

1. A **zero-dependency native transport** (native WebSocket or SSE) implementing the `Transport` interface, default in place of `SocketIoTransport`.
2. Dashboard client uses the native protocol; the `/socket.io/socket.io.js` include is removed.
3. `socket.io` removed from `packages/taskflow` dependencies once unreferenced.
4. Behavior identical: activity / status / file-change frames + initial snapshot on connect; reconnect handled.

## Scope

### In scope

- New `Transport` impl (e.g. `NativeWsTransport` or `SseTransport`) in `dashboard/server/`, wired as the default in `dashboard/server/index.ts`.
- Server-side native `http` `upgrade` handling (native WS) **or** an SSE endpoint; broadcast + per-connection snapshot via the existing `Transport.onConnection(client)`.
- Client reconnect/heartbeat logic in `dashboard/server/dashboard.ts` replacing the socket.io client.
- Remove `socket.io` from `package.json`; drop the client `<script>` include.

### Out of scope

- The React dashboard (deferred). Lint (N82); storage (N84). Changing the frame schema/semantics.
- The **master server's** own socket.io usage — decide in ANALYSIS whether in-scope or a fast-follow (lean: likely a follow-up).

## Implementation plan

1. **Choose protocol** — native WebSocket (bidirectional, full parity) vs SSE (server→client only, simpler; verify the dashboard needs no client→server channel). Record the decision in ANALYSIS.
2. **Implement** the transport behind the existing `Transport` interface (keep `SocketIoTransport` only if a fallback is wanted; otherwise replace).
3. **Server wiring** — native `upgrade`/SSE; `emit` broadcast + `onConnection` snapshot.
4. **Client** — replace socket.io-client usage in `dashboard.ts`; reconnect + heartbeat.
5. **Drop the dep** — remove `socket.io` + the client script; confirm nothing references it.
6. **Verify live** — boot `ui`, observe live frames + reconnect after a server restart.

## Verification

- `git grep "socket.io"` returns nothing in shipping code; `socket.io` absent from `package.json`.
- Live: `insight-flow ui` → dashboard receives live updates (activity feed moves, status badge changes, file-change refresh) over the native transport.
- Reconnect: drop the connection / restart the server → client reconnects and resumes frames.
- typecheck + tests green; the N81 `e2e-smoke` test still passes.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Follow-up to N81; uses its `Transport` seam. **GATE for the deferred React dashboard (C).** North Star: **"lean now, scale deliberately."**
- Independent of N82 (lint) and N84 (storage).
