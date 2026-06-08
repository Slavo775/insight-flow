# N83 — Replace socket.io with a native WebSocket/SSE transport behind the Transport seam — Checklist

## Done criteria

- [ ] Native (zero-dep) `Transport` impl is the default in place of `SocketIoTransport`.
- [ ] Dashboard client uses the native protocol; `/socket.io/socket.io.js` include removed.
- [ ] `socket.io` removed from `packages/taskflow` deps; no references remain in shipping code.
- [ ] Live frames (activity / status / file-change) + initial snapshot + reconnect behave identically.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes (N81 e2e smoke green)
- [ ] `git grep "socket.io"` clean in shipping code

## Verification

- [ ] Live `insight-flow ui`: dashboard updates over the native transport and reconnects after a dropped connection.
