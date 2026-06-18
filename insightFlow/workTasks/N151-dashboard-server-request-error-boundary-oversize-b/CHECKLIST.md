# N151 — dashboard server request error boundary + oversize-body 413 — Checklist

## Done criteria

- [ ] Handler-wide try/catch in the `createServer` callback → 500 JSON on throw (headers-not-sent guarded)
- [ ] Async `req.on("end")` body callbacks (esp. `/api/task-flow`) guarded → 500, not a crash
- [ ] `/api/task-flow` oversize → 413 response instead of `req.destroy()` hang
- [ ] Shared `sendError`/`readBody`-style helper instead of repeated try/catch
- [ ] Happy paths + existing per-endpoint handling unchanged
- [ ] No `process.on("uncaughtException")` backstop added (out of scope)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new boundary test)
- [ ] No regressions to existing dashboard endpoints

## Verification

- [ ] New test: malformed/missing `master.json` request → 500 (handled), server does not crash
- [ ] Manual: corrupt `master.json`, hit the dashboard → 500 + server stays up
