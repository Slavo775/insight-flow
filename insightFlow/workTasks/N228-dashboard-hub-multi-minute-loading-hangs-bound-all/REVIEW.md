# N228 — Dashboard/hub multi-minute loading hangs — bound all upstream waits and self-heal stale proxy targets — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Bounds every upstream wait so a flaky project can no longer produce a multi-minute "loading" spinner. Master proxy gains a **15s time-to-first-byte timeout** (via an `AbortController` signal, cleared the instant the response begins → SSE-safe) returning **504** instead of hanging, plus **self-heal** (re-probe `/health` + broadcast) on failure; client fetches gain a **20s AbortController timeout**; the store surfaces a **loadError + 5s auto-retry** replacing the permanent "Loading…"; the `file-change → sync()` reaction is **debounced (400ms)**. **Risk: low-medium** — production-critical proxy path, but the change is well-scoped and verified end-to-end. No blockers; a few defensive non-blocking items.

## Verification performed

- **Wedged upstream** (accepts, never replies) via a live master + stub → **HTTP 504 in 15007ms**, not a hang; diagnostic log emitted.
- **Healthy upstream** → **HTTP 200 in 2ms** (normal proxy works; TTFB timer cleared on first byte).
- **SSE client disconnect mid-stream** (the reviewer's crash concern) → master stayed **alive HTTP 200, no unhandled exception, 3/3 runs** on Node 22.13.1. `proxyReq.destroy()` (no-arg) does not emit `'error'`, so no spurious self-heal probe and no crash.
- Independent correctness pass (review-correctness subagent): double-response guard, SSE-safety, AbortController semantics, and timer/socket leak-freedom all verified clean.
- Build (tsc + vite) + eslint clean.

## Original summary



<one paragraph: what changed, risk level>

## Checklist verification

- [x] Proxy has TTFB timeout; returns 504 (guarded by `!res.headersSent`) — pass (`server.ts` proxyToProject; verified 504@15s)
- [x] Proxy error/timeout triggers self-heal (re-probe/mark-offline) — pass (`onUpstreamFail` → `probeProjectHealth` + broadcast)
- [x] Client fetches bounded by AbortController timeout — pass (`base.ts` 20s default)
- [x] Permanent "Loading…" replaced by error + auto-retry — pass (`store.ts` loadError + scheduleRetry; `App.tsx` banner)
- [x] `file-change → sync()` debounced/coalesced — pass (`useDashboardStream.ts` 400ms)
- [x] Proxy logs slow/timed-out requests — pass (timeout + slow warns)
- [x] SSE unchanged; buildProjectState/hydrate left as-is — pass
- [x] Normal navigation <1s; SSE still works — pass (200 in 2ms; disconnect no-crash)

## Blockers

None.

## Non-blocking

1. **No `proxyRes.on("error")` listener** (`server.ts` proxyToProject, response callback). `proxyRes.pipe(res)` doesn't forward source errors. Empirically the client-disconnect teardown does **not** crash on Node 22.13.1 (verified 3/3), and the timeout-abort fires before `proxyRes` exists — so not a crash today. Cheap insurance for cross-version robustness: add `proxyRes.on("error", () => { try { res.destroy(); } catch {} });`. (Pre-existing — `res.on("close")→destroy` predates N228.)
2. **`onUpstreamFail` `.then` without `.catch`** (proxy call site). `probeProjectHealth` can't reject, but the `.then` (registry/broadcast) is unguarded; add `.catch(() => {})`.
3. **HTML-shell narrow window** — the buffered-HTML path defers `res.writeHead` to `proxyRes.on("end")`; an upstream error in that window could double-`writeHead`. Very hard to hit (timer blocked by `settled`, disconnect doesn't emit error). Optional hardening: set `settled` / guard before the deferred writeHead.
4. **Abort message UX** — a client-side fetch timeout surfaces the raw `AbortError` message ("The operation was aborted") in `loadError`. Consider mapping abort → "Timed out — retrying…".

## Non-blocking — all resolved (task-review-fix, user-authorized "fix all")

1. ✅ Added `proxyRes.on("error", () => res.destroy())` at the top of the response callback — pipe source errors can no longer surface as unhandled.
2. ✅ Added `.catch(() => {})` to the `onUpstreamFail` self-heal probe promise.
3. ✅ Guarded the deferred HTML-shell `writeHead` (`if (res.headersSent || res.writableEnded || res.destroyed) return;`) and hardened the error-handler write with the same `!res.writableEnded && !res.destroyed` check — no double-`writeHead`.
4. ✅ Aborted (timed-out) client fetches now show "Timed out — retrying…" instead of the raw `AbortError` message (`loadErrorText` in `store.ts`).

Re-verified after these changes (real master + stubs): FAST → **200 in 3ms**, SSE client disconnect → **master alive, no crash**, WEDGED → **504 in 15006ms**. Build + eslint clean.

## Security & edge cases

- No new security surface. The self-heal reuses the existing loopback-only, token-scoped `/health` probe (`isLoopbackUrl` SSRF guard preserved). Proxy SSRF/loopback guards untouched. Timeouts are DoS-hardening (bound resource waits), not a new exposure.

## Notes

- Root cause + decision in ANALYSIS.md (bound waits + observability over chasing one unreproducible trigger). Measured shard scan 1.83ms → buildProjectState/hydrate correctly left sync.
- Related: N212–N217 (PWA hub epic — the proxy this hardens), N83 (SSE), N214 (`/health` liveness reused by self-heal).


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

> "done please merge into the base branch"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

- Merge instruction: merge N228 into the base branch `fixes` (same base as N226/N227). To be carried out in the `/task-git` step.
