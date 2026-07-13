# N228 — Analysis (Pre-Taskmaster)

## Problem framing

User reports the dashboard (and navigating to project/other pages) sometimes hangs for **2–3 minutes or longer** showing only "Loading…", then resolves. Happens **anytime** (idle or during active work) and **more often through the PWA hub**; also seen in a plain Chrome tab before.

## Goal

Make it impossible for a request to hang unboundedly, and make the intermittent stall observable — rather than chase a single trigger I could not reproduce live.

## Investigation (measured + code)

- **Live timing (idle):** every endpoint responded in ~1ms — master `/`, project `/`, `/api/work-tasks`, shard fetch ×5, `/api/activity` ×3. So the stall is intermittent, not a permanently slow endpoint. (`/events` "hung" 200s — expected, it is the SSE stream.)
- **Ruled out — data volume:** a full `buildProjectState`-equivalent scan of the 228-task / 23-shard project measured **1.83ms** (≈2% loop occupancy even at the 100ms watch debounce). The "reading all tasks is slow" theory is false for this size.
- **Root risk — unbounded waits (code, Explore agent):**
  - Master hub proxy `proxyToProject` (`master/server.ts` ~493-592, request ~518) has **no `proxyReq.setTimeout`** — a half-open / slow / stale-port upstream makes the proxied request and the browser wait forever. This is the strongest explanation for multi-minute / indefinite spinners, and the PWA routes everything through this proxy (matches "worse via PWA").
  - Dashboard client fetches never time out; the store's `label: "Loading…"` (`client/store.ts`) is the permanent default until `sync()` resolves — so a stalled fetch looks like an eternal spinner with no error.
- **Amplifier — file-change storm:** recursive `fs.watch` + 100ms debounce broadcasts `file-change` to all SSE clients; the client re-runs full `sync()` on each (`useDashboardStream.ts` ~73). During active writes every tab re-fetches repeatedly, piling load. (Secondary — the user also sees hangs when idle, so this is not the primary cause.)

User answers that sharpened it: happens **anytime including idle** (⇒ not load/contention; points to half-open sockets / stale registry / unbounded proxy wait) and **more via PWA** (⇒ the proxy is central).

## Options considered

1. **Bound all upstream waits + self-heal + observability** (proxy timeout + client fetch timeout/error-retry + coalesce file-change + slow-request logging). Directly kills the unbounded spinner regardless of the exact trigger; makes the next occurrence diagnosable. **Chosen.**
2. **Make `buildProjectState`/`hydrateShardJson` async/cached.** Rejected as primary — measured 1.83ms, not the cause; would be churn for no user-visible gain.
3. **Chase one root cause and fix only that.** Rejected — could not reproduce live; the honest, robust move is to make stalls bounded + observable.

## Decision

Option 1, priority `high`. Add connect + response timeouts to the master proxy (504 on timeout, `!res.headersSent` guard) with self-heal (re-probe/re-register or mark offline) on failure; add AbortController timeouts to client fetches with an error + auto-retry state replacing the permanent "Loading…"; debounce the client `file-change → sync()`; add slow-request/timeout logging on the proxy. Keep SSE. Leave `buildProjectState`/`hydrate` as-is.

## Open questions

- Exact timeout values (proxy response ~15s? connect shorter? client fetch ~10s? retry backoff) — pick sane defaults in implementation; not a blocker.
- Whether the outbound liveness `req.setTimeout(0)` (`dashboard/server/index.ts:444`) is a half-open source — note during implementation; out of scope unless proven.

## Sources

- `packages/taskflow/src/master/server.ts` — `proxyToProject` (~493-592, req ~518; error handler ~570; `res.on("close")` ~590); `/api/hub/refresh` health path (~1099-1116); overview served from in-memory registry (~1273-1276).
- `packages/taskflow/src/dashboard/client/store.ts` — `label: "Loading…"` default; `sync()`/`loadShard()`.
- `packages/taskflow/src/dashboard/client/api.ts` — `apiFetch` wrappers (`fetchShardIndex`/`fetchShard`/`fetchMaster`).
- `packages/taskflow/src/dashboard/client/useDashboardStream.ts:73` — `file-change` → `sync()`.
- `packages/taskflow/src/dashboard/server/index.ts` — `buildProjectState` (~468-513, measured 1.83ms), recursive `fs.watch` (~203), 100ms debounce (~116).
- Live measurements: all endpoints ~1ms idle; shard scan 1.83ms / 228 tasks.

## Handoff brief

Type `fix`, priority `high`, tags `performance,dashboard,master,proxy,sse`. Bound every upstream wait: master proxy timeouts (504 + self-heal), client fetch timeouts with error+auto-retry replacing the permanent "Loading…", coalesce the client `file-change → sync()` storm, and add slow-request logging on the proxy. Keep SSE; leave buildProjectState/hydrate (measured cheap). Verify against a simulated dead/slow upstream and a port-changed project — no multi-minute hang, fast 504 + retry instead.
