# N227 — Dashboard agent status stuck on idle on load — make backend the single source of truth over SSE

**Type:** fix
**Priority:** medium
**Created:** 2026-07-13

## Problem

When the per-project dashboard is opened fresh (e.g. navigating in from the master landing page), the **"Agent Activity"** badge is stuck on **"idle"** even when the agent is active. The initial SSE `snapshot` frame carries the activity event array but **no derived active/idle status**, and the client never derives status from those seeded events — so the badge sits at its hardcoded default `"idle"` until the next live event arrives. The master landing page shows the correct status because it derives active/idle from the same activity array on every render. The active/idle derivation is currently duplicated in **three** places, which is why the two screens disagree.

## Goal

1. The dashboard shows the **correct** active/idle status on first load (no more stuck-on-idle), including after a server restart.
2. The **backend is the single source of truth** for active/idle; the derived value is sent in the initial SSE snapshot.
3. The dashboard client sets `agentStatus` from the snapshot on load instead of the hardcoded default.
4. The master landing page uses the **backend-provided** status, so the two screens can never disagree again.
5. Transport stays **SSE** (no websockets); no new persisted status file.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — the `transport.onConnection` `snapshot` payload (~line 1635): add the derived active/idle status (`eventStore.getStatus()` / `deriveStatus`).
- `packages/taskflow/src/dashboard/server/event-stream.ts` — `EventStore` (init `status: "idle"` ~line 48): on startup, **seed** the store's derived status from the durable activity JSONL log (the same tail `ActivityEngine.start()` reads, N225) instead of unconditionally defaulting to idle.
- `packages/taskflow/src/dashboard/client/store.ts` — `applySnapshot` (~line 64) + initial `agentStatus: "idle"` (~line 52): set `agentStatus` from the snapshot's status field on load.
- `packages/taskflow/src/dashboard/client/useDashboardStream.ts` — `snapshot` handler (~lines 46-59): pass the snapshot status through to the store.
- `packages/taskflow/src/master/overview.ts` — `deriveIdleStatus` (~line 397) / `renderActivityMini`: consume the backend-authoritative status from project state instead of re-deriving locally (and `buildProjectState` in `index.ts` ~line 448 must include that status when it pushes state to master).
- Consolidate the active/idle derivation so there is one authoritative implementation (server) the others defer to; reduce the client/master duplicates where practical.

### Out of scope

- **Transport change** — keep native SSE; do NOT reintroduce socket.io/websockets (deliberately removed in N83).
- The activity **feed rows** ("Bash", "TOOL-APPROVED", the per-tool JSONL classification) — display/labels unchanged.
- Any new persisted status file — derive from the durable activity log; do not add a separate on-disk status.
- The 60s liveness/online-dot logic (`isProjectLive`) — unrelated.
- Per-task `events.json` lifecycle files — unrelated to the agent active/idle badge.

## Implementation plan

1. **Pick the authoritative derivation** — treat the server `EventStore.deriveStatus` (`event-stream.ts:35`) as the single source of truth for active/idle. Confirm its mapping matches the master's `deriveIdleStatus` behavior (last event: `Phase/done` → idle, else active) so consolidation doesn't change results.
2. **Seed status on startup** — when the dashboard server boots, feed the durable activity log tail (already read by `ActivityEngine.start()`, N225) into the EventStore so `getStatus()` reflects reality instead of defaulting to `"idle"`.
3. **Add status to the snapshot** — in `index.ts` `transport.onConnection`, include the derived status (e.g. `agentStatus: eventStore.getStatus()`) in the `snapshot` payload alongside `activity`.
4. **Seed the client badge** — in `useDashboardStream.ts` snapshot handler + `store.ts` `applySnapshot`, set `agentStatus` from the snapshot's status field (fall back to `"idle"` only if absent).
5. **Feed status to master** — `buildProjectState` (`index.ts:448`) includes the authoritative status in the state pushed to master; `overview.ts` renders that field via `renderActivityMini` instead of calling `deriveIdleStatus` on `recentActivity`.
6. **Trim duplication** — remove/redirect the now-redundant local derivations (client `activity.ts` `claudeStatusFromEvent` for the initial value; master `deriveIdleStatus`) so live updates and initial load both trace back to the one backend value. Keep client-side handling of live `status` frames.
7. **Verify** — fresh load + restart both show correct status; master and dashboard agree.

## Verification

- `pnpm --dir packages/taskflow run build` passes (tsc + vite + client tsconfig).
- Manual: with the agent active, open `insight-flow ui` fresh (hard reload / navigate from master) → Agent Activity badge shows **"active"** immediately, not "idle".
- Restart the dashboard server while the last logged activity was "active" → on reload the badge still shows "active" (seeded from the durable log), not idle.
- Master landing page and the project dashboard show the **same** active/idle value for the same project at the same time.
- Trigger a new activity event → badge still updates live over SSE (no regression).

## Notes

- Root cause traced during `/task-analyze` (see ANALYSIS.md). Both surfaces already receive the same seeded activity array (N225 durable log); the only gap is the dashboard never deriving/serving the status on initial load.
- The backend already exposes the answer at `GET /log/status` (`index.ts:1497`, `eventStore.getStatus()`) — it's simply not in the snapshot nor read by the client.
- Related: N225 (durable activity feed across restarts), N83 (socket.io → native SSE — the reason we keep SSE).
