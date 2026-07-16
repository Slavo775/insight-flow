# N242 — Debug log engine — master /log + /logs API + log-store (Zod, per-project JSON, throttled trim) — Checklist

## Done criteria

- [ ] `LogInputSchema` (`{type: error|warning|info, message, data?}`) + `StoredLogSchema` (`+ timestamp, projectName`) in `core/schema/index.ts`
- [ ] `core/log-store.ts`: `appendLog`, `readLogs`, `clearLogs`, `listProjects` writing to `~/.insight-flow/logs/<project|master>/{error,info,warning}.json`
- [ ] Throttled trim: keeps last ~1000 per file, runs at most once per 5 min per file (throttle, not debounce)
- [ ] All fs operations are try/catch-guarded (store never throws into the request path)
- [ ] `registry.getByToken(token)` added
- [ ] `recordLog(key, log)` shared path: resolves project (`master` key or by token), validates, enriches, appends
- [ ] `POST /log` route (trusted-gated): 202 ok / 400 bad body / 401 unknown key; fire-and-forget store
- [ ] `GET /logs?project=<name>|master|all&type=&page=&pageSize=`: read + merge + sort desc + paginate
- [ ] Master logs its own entries via `recordLog` (reserved `master` key) — no self-HTTP

## Quality gates

- [ ] `pnpm --dir packages/taskflow build` passes
- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow test` passes (new tests for log-store + /log + /logs)
- [ ] No regressions in master routing / registry

## Verification

- [ ] `POST /log` with a valid project token → entry in that project's `error.json` (timestamp + projectName)
- [ ] `POST /log` with `key:"master"` → entry in `logs/master/`
- [ ] >1000 appends → file trims to ~1000 after the throttle window
- [ ] `GET /logs?project=all&type=error` → merged, newest-first, paginated
