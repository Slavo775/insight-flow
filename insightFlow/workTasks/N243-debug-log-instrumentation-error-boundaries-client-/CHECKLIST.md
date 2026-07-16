# N243 — Debug log instrumentation — error boundaries (client+server) + registration logging (master+project) — Checklist

## Done criteria

- [ ] Shared React `ErrorBoundary` mounted at the root of both clients (`dashboard/client`, `master/client`)
- [ ] On a caught render error → an `error` log sent (message + componentStack + url)
- [ ] Master `uncaughtException` / `unhandledRejection` handlers → `recordLog("master", …)`; master stays up
- [ ] Project server `uncaughtException` / `unhandledRejection` handlers → forward log to master with its key
- [ ] Registration logs — project: `registration start` + `registration finished` (with key/id)
- [ ] Registration logs — master: `registration received` + `generated code` (with project name + entry data)
- [ ] Client→master log path decided + implemented (likely client → own project server → master)

## Quality gates

- [ ] `pnpm --dir packages/taskflow build` passes
- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in registration / server startup

## Verification

- [ ] Throw in a client component → `error` log with component stack in the project's `error.json`
- [ ] Force an unhandled rejection on the master → `error` log in `logs/master/`, master alive
- [ ] Register a project → 4 registration `info` logs (2 project, 2 master)
