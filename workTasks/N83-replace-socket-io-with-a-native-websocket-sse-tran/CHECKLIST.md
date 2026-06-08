# N83 — Replace socket.io with a native WebSocket/SSE transport behind the Transport seam — Checklist

## Done criteria

- [x] Native (zero-dep) `Transport` impl (`SseTransport`) is the default in place of `SocketIoTransport`.
- [x] Dashboard client uses native `EventSource('/sse')`; `/socket.io/socket.io.js` include removed. (Master overview also converted to `EventSource('/events')` — full swap per agreed scope.)
- [x] `socket.io` removed from `packages/taskflow` deps (`dependencies` is now just `zod`); only history comments mention it in `src`.
- [x] Initial snapshot + live frames + reconnect behave identically (snapshot verified live over SSE; EventSource reconnects natively).

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow test` passes (87 tests; e2e smoke + master-boot green) + lint + format:check clean
- [x] `git grep "socket.io"` shows no code references in `src` (only `// replaced socket.io` history comments)

## Verification

- [x] Live `insight-flow ui`: `/sse` streams `retry` + `event: snapshot`; client uses `EventSource('/sse')`, no socket.io script; startup logs `Live: SSE at /sse`. EventSource reconnects natively.

## Notes

- Full swap (both servers) per the agreed scope: dashboard (Transport seam) + master server + overview client all on native SSE; `socket.io` dropped entirely. Unblocks the future React backend (deferred Task C). No frame schema/semantics changed.
