# N228 — Dashboard/hub multi-minute loading hangs — bound all upstream waits and self-heal stale proxy targets

**Type:** fix
**Priority:** high
**Created:** 2026-07-13

## Problem

Opening the dashboard, or navigating to a project / other pages, sometimes hangs for **2–3 minutes or longer** showing only "Loading…", then eventually resolves. It happens both when idle and during active work, and **more often through the PWA hub**. Investigation (ANALYSIS.md) ruled out data volume (one full 228-task shard scan = **1.83ms**) and traced it to **unbounded upstream waits**: the master hub proxy `proxyToProject` has **no upstream timeout**, so a half-open / slow / stale-port project server makes the proxied request — and the browser — wait indefinitely; and the dashboard client's data fetches never time out, so the store's `label: "Loading…"` default stays forever. Because the PWA routes everything through the one proxy, a single flaky upstream stalls navigation everywhere.

## Goal

1. No request can hang unboundedly — the master proxy and the client fetches both fail fast with a clear ceiling.
2. A stalled/half-open/stale-port upstream returns a real error (504/502) instead of an eternal spinner; the UI shows an error + auto-retries.
3. The master self-heals a stale proxy target (marks offline / re-probes / re-registers) so repeat navigations don't keep hitting a dead port.
4. An active-work "file-change storm" no longer makes every tab re-fetch repeatedly.
5. The next occurrence is diagnosable (slow-request / timeout logging on the proxy).

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — `proxyToProject` (~line 493-592, request at ~518): add a **connect timeout** and a **response/idle timeout** via `proxyReq.setTimeout(...)`; on timeout, `destroy()` the upstream request and return **504** (headers-not-sent guard) instead of hanging. On proxy error/timeout, trigger the existing health-refresh / re-probe path so a stale registry entry is corrected (self-heal). Add lightweight timing log (method, path, projectId, elapsed) when a proxied request exceeds a threshold or times out.
- `packages/taskflow/src/dashboard/client/store.ts` + `api.ts` (`fetchShardIndex`/`fetchShard`/`fetchMaster` in `client/api.ts`, and `sync()`/`loadShard()` in `store.ts`): add a fetch timeout (`AbortController`), and surface a distinct **error state** (replace the permanent `label: "Loading…"` / add an `error` flag) with **auto-retry** (bounded backoff).
- `packages/taskflow/src/dashboard/client/App.tsx` (or the loading view): render the error + retry UI when the fetch fails/times out instead of an indefinite spinner.
- `packages/taskflow/src/dashboard/client/useDashboardStream.ts` — the `file-change` handler (~line 73) `() => void store().sync()`: **debounce/coalesce** so a burst of file-change frames triggers at most one `sync()` per interval.

### Out of scope

- Making `buildProjectState` / `hydrateShardJson` async or cached — measured cheap (~1.83ms for 228 tasks); not the cause, skip to keep the diff focused.
- Transport change — keep native SSE (no websockets).
- The liveness `req.setTimeout(0)` on the outbound master liveness stream (`dashboard/server/index.ts:444`) — intentionally infinite; leave unless it proves to be a half-open source (note only).
- Task schema, storage, agent prompts.

## Implementation plan

1. **Proxy timeouts** — in `proxyToProject` (`master/server.ts`), after creating `proxyReq` add `proxyReq.setTimeout(PROXY_TIMEOUT_MS, () => proxyReq.destroy(new Error("upstream timeout")))`. Ensure the existing `on("error")` handler (~570) responds `504`/`502` **only if `!res.headersSent`**. Pick a sane bound (e.g. 15s response, shorter connect); define as a named const.
2. **Self-heal stale target** — on proxy error/timeout for a project, invoke the master's project health-refresh / re-register path (the one behind `/api/hub/refresh`) for that project so the registry's port is corrected; if still unreachable, mark it offline so the overview reflects reality.
3. **Client fetch timeouts** — wrap the `apiFetch` calls in `client/api.ts` with an `AbortController` + timeout; on abort/failure propagate a typed error.
4. **Client error + retry state** — in `store.ts`, add an `error`/`loadState` field; `sync()`/`loadShard()` set it on failure and schedule a bounded-backoff retry; `App.tsx` renders an error+retry view instead of the permanent "Loading…".
5. **Coalesce file-change** — in `useDashboardStream.ts`, debounce the `file-change` → `sync()` reaction (e.g. 250–500ms trailing) so a write storm causes one re-sync, not N.
6. **Slow-request logging** — log proxied requests that exceed a threshold (and all timeouts) with path + projectId + elapsed ms, so the next stall is diagnosable.
7. **Verify** (see below).

## Verification

- `pnpm --dir packages/taskflow run build` passes (tsc + vite + client tsconfig).
- **Simulated dead/slow upstream:** point the master at a project whose server is unreachable or artificially slowed (e.g. a stub that never responds); a proxied request returns **504 within the timeout**, not an indefinite hang; the browser shows an error + retry, and a follow-up succeeds once the upstream recovers.
- **Stale port self-heal:** restart a project so its port changes; navigating via the hub either self-corrects (re-register) or shows offline within the timeout — no multi-minute spinner.
- **File-change storm:** during rapid writes to a project's `workTasks/`, confirm the client issues a coalesced single `sync()` per interval (not one per frame) via network panel.
- No regression: normal navigation still loads in well under a second (matches the ~1ms measurements); live SSE updates still work.

## Notes

- Root cause traced during `/task-analyze` (ANALYSIS.md). Live endpoints measured ~1ms while idle; the stall is intermittent and could not be captured live, hence the emphasis on **bounding waits + observability** over chasing a single unproven trigger.
- User reports: happens **anytime** (idle or busy), **more via the PWA hub** (single-origin reverse proxy → the proxy timeout is the highest-value fix). Related: N83 (SSE), N212–N217 (PWA hub epic), N225 (durable activity feed).
