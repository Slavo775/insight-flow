# N228 — Dashboard/hub multi-minute loading hangs — bound all upstream waits and self-heal stale proxy targets — Checklist

## Done criteria

- [ ] Master proxy `proxyToProject` has connect + response timeouts; returns 504 on timeout (guarded by `!res.headersSent`)
- [ ] Proxy error/timeout triggers self-heal (re-probe/re-register or mark offline) so stale ports self-correct
- [ ] Client data fetches (`api.ts`) are bounded by an AbortController timeout
- [ ] Permanent "Loading…" replaced by an error + auto-retry (bounded backoff) when a fetch fails/times out
- [ ] `file-change → sync()` is debounced/coalesced (one re-sync per interval, not per frame)
- [ ] Proxy logs slow/timed-out requests (path + projectId + elapsed) for diagnosis
- [ ] SSE transport unchanged; buildProjectState/hydrate left as-is

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (tsc + vite)
- [ ] eslint clean on changed files (pre-commit: prettier + eslint --fix + typecheck)
- [ ] Normal navigation still loads in <1s; live SSE updates still work

## Verification

- [ ] Unreachable/slow upstream → proxied request returns 504 within the timeout (not an indefinite hang); UI shows error + retry; recovers on next try
- [ ] Restart a project (port changes) → hub self-corrects or shows offline within the timeout, no multi-minute spinner
- [ ] Rapid writes to a project's `workTasks/` → client issues a single coalesced `sync()` per interval (network panel)
