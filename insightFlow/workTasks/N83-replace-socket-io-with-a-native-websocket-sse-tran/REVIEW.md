# N83 — Replace socket.io with a native WebSocket/SSE transport behind the Transport seam — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-08
**PR:** https://github.com/Slavo775/insight-flow/pull/58
**Verdict:** approved

## Summary

Replaces socket.io with native Server-Sent Events across **both** servers (full swap, agreed scope): the dashboard's `SseTransport` (behind N81's `Transport` seam, routed via `transport.handleRequest` at `GET /sse`) and the master server's `GET /events` stream; both clients use `EventSource`. The `socket.io` dependency is dropped (`dependencies` is now just `zod`) and both `/socket.io/socket.io.js` includes removed. Risk: **medium** — touches the realtime layer of two servers + two browser clients, but behavior is preserved (snapshot on connect + activity/status/file-change frames + native EventSource reconnect) and proven live on both servers; 87 tests + typecheck + lint + format:check green.

## Checklist verification

- [x] Native zero-dep `Transport` (`SseTransport`) is the default — pass.
- [x] Dashboard client uses `EventSource('/sse')`; socket.io script removed — pass (verified in served HTML).
- [x] `socket.io` removed from deps; no code refs in `src` — pass (`dependencies: {zod}`; only `// replaced socket.io` history comments remain).
- [x] Snapshot + live frames + reconnect behave identically — pass (snapshot streamed live on both servers; EventSource reconnects natively).
- Quality gates: typecheck ✓ · lint ✓ · format:check ✓ · 87 tests ✓.

## Blockers

None.

## Non-blocking

1. **No automated test for SSE stream delivery (the most useful follow-up).** `e2e-smoke` checks `/`, `/api/work-tasks`, `/api/activity` but **not** `/sse` (grep: 0); `seams.test.mjs` checks the `SseTransport` contract (methods exist) but not an actual frame. The swap is verified **manually** (live curl on both `/sse` and `/events`) — solid, but a regression wouldn't be caught in CI. Recommend extending `e2e-smoke` to connect to `/sse` and assert the `snapshot` frame arrives.
2. **`connectWS` is now a misnomer** (it opens an `EventSource`, not a WS). Cosmetic rename.
3. **History comments ship in the served inline JS** (`// ... replaced socket.io`) — a few bytes in the dashboard/overview HTML. Cosmetic; could be stripped.

## Security & edge cases

- SSE responses set `Access-Control-Allow-Origin: *` (same-origin in practice — harmless) and include a 25 s `: ping` heartbeat + `X-Accel-Buffering: no` so idle streams survive proxies/nginx. Good hardening.
- `req.on("close")` clears the heartbeat interval and removes the client from the set on both servers — no leaked intervals/handles on disconnect.
- No SSE `Last-Event-ID` resume: a reconnect does a **full resync** (the server re-sends `snapshot`). This matches the old socket.io behavior (which also resynced on reconnect) — not a regression.
- Master `/events` sends **no** initial snapshot on connect — correct, and matches the old master (overview's initial state is server-rendered in the page; the socket only ever pushed live `project-update`s).
- `transport.handleRequest` runs before the dashboard's CORS/route logic and returns early for `/sse`; non-`/sse` requests are untouched (returns false). Verified non-SSE routes still answer 200.

## Notes

- Verified live on **both** servers: dashboard `/sse` streams `retry` + `event: snapshot`; master `/events` opens `text/event-stream` 200 with the overview client on `EventSource('/events')`.
- **Unblocks the deferred React dashboard (Task C)** — socket.io is fully gone, so a lean React backend is now viable.
- The N82 pre-commit hook (lint + typecheck) guarded every commit of this work.

## Follow-up — non-blocking items addressed (post-approval)

`/task-review-fix` applied all three non-blocking findings (no behavior change; verdict stands — 87 tests + typecheck + lint + format:check green):

- **Finding 1** — added an automated SSE-stream assertion to `e2e-smoke.test.mjs`: it now connects to `/sse` and asserts the `snapshot` frame arrives (closes the manual-only gap; this is the meaningful one).
- **Finding 2** — renamed `connectWS` → `connectStream` in the dashboard + overview clients.
- **Finding 3** — removed the `// replaced socket.io` history comments from the served inline JS.
