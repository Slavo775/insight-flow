# N83 — Analysis (pre-taskmaster strategist trail)

> Produced by `/task-analyze`. Follow-up to N81 (uses its `Transport` seam). **Gate for the deferred React dashboard.** North Star: **"lean now, scale deliberately."**

## Problem framing

`socket.io` is the heaviest dependency in the package and powers the dashboard's live layer (server `IOServer` + the `/socket.io/socket.io.js` client lib). It contradicts the "lightweight" goal and would bloat a future React backend. N81 deliberately wrapped all dashboard socket.io usage behind a `Transport` interface (`dashboard/server/transport.ts`) so the implementation can be swapped without touching call sites — this task does the swap.

## Goal

Replace `SocketIoTransport` with a **zero-dependency** native transport behind the same `Transport` interface, drop the `socket.io` dependency, and preserve behavior exactly (activity / status / file-change frames + initial snapshot + reconnect).

## Options considered

- **SSE (Server-Sent Events)** *(leaning recommendation)* — truly dependency-free (`text/event-stream` over plain HTTP), and the browser's `EventSource` handles reconnect/heartbeat natively. **Key fit:** the dashboard's socket is **server→client broadcast + a per-connection snapshot** only; client→server actions already go over HTTP POST (`/log/events`, `/api/agent-done`, `/api/agent-permission`). If there's no client→server socket need, SSE is the simplest, leanest swap.
- **Native WebSocket (hand-rolled)** — full bidirectional parity, but "native" means hand-rolling the RFC-6455 upgrade handshake + frame (de)coding on Node's `http` `upgrade` event — non-trivial and easy to get subtly wrong. Justified only if a client→server socket channel is actually required.
- **`ws` library** — trivial WS server, but it's *a dependency* — defeats the "drop socket.io to go lean" purpose (though far lighter than socket.io). Fallback if hand-rolling WS proves too costly and SSE is insufficient.
- **Keep socket.io** — rejected (the whole point is to shed it).

## Decision

Swap to a native transport behind the `Transport` seam. **Verify first whether the dashboard needs any client→server socket traffic**; if not (expected), implement **SSE** (leanest). If a bidirectional channel is needed, hand-rolled native WS, with `ws` as a documented fallback. Scope the **master server's** separate socket.io usage as a likely **fast-follow**, not this task, to keep the change bounded.

## Open questions

- **SSE vs native WS** — hinges on whether any client→server socket message exists today (audit `dashboard.ts` socket usage; POST routes suggest no).
- Is the **master server** socket.io swap in-scope or a follow-up? (Lean: follow-up.)
- Reconnect/heartbeat parity + the initial-snapshot-on-connect semantics.

## Sources

- N81 `dashboard/server/transport.ts` (the seam) and the `io.emit` call sites it wrapped.
- `dashboard/server/index.ts` HTTP routes — client→server actions already use POST endpoints.
- `socket.io` in `packages/taskflow/package.json` dependencies.

## Handoff brief

> **Title:** Replace socket.io with a native WebSocket/SSE transport behind the Transport seam · **Type:** rework · **Priority:** high
> Implement a zero-dep native transport (SSE if server→client-only suffices, else native WS) behind N81's `Transport` interface, default over `SocketIoTransport`; update the dashboard client; remove the `socket.io` dependency. Behavior identical. Out of scope: React dashboard; (likely) the master server's socket.io.
