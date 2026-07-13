# N227 — Analysis (Pre-Taskmaster)

## Problem framing

Opening the per-project dashboard fresh (typically by navigating from the master landing page) shows the "Agent Activity" badge stuck on **"idle"**, even when the agent is active. The **master landing page shows the same status correctly**.

Trace found the two surfaces receive the **same** activity event array on load (durable JSONL log made persistent in N225), but treat it differently:

- **Master** derives active/idle from that array on every render, including first paint (`master/overview.ts` `deriveIdleStatus`, ~line 397) → correct.
- **Dashboard** server sends the array in its initial SSE `snapshot` (`server/index.ts` ~line 1635) but **no derived status**; the client `applySnapshot` (`client/store.ts` ~line 64) never derives status, so `agentStatus` stays at the hardcoded default `"idle"` (`store.ts` ~line 52) until the next live event.

Active/idle logic is duplicated in **three** places (server `event-stream.ts` EventStore, client `activity.ts` `claudeStatusFromEvent`, master `overview.ts`), which is the underlying reason the screens can disagree.

## Goal

Dashboard shows the correct active/idle status on first load (and after restart); the **backend becomes the single source of truth**, sending the derived status in the initial SSE snapshot; the master consumes that same authoritative value.

## Options considered

1. **Small fix only** — add the already-computed status to the snapshot and have the client show it on load (mirror the master). Fixes the bug; leaves the 3-way duplication.
2. **Fix + single source of truth (backend), keep SSE** — do the fix AND make the backend authoritative, removing/redirecting the duplicated derivations. Fixes the bug and prevents the mismatch class. **Chosen.**
3. **Full move to backend + WebSocket** — user's original phrasing. Rejected the WebSocket part: the live pipe already exists as native SSE, and socket.io was deliberately removed in N83; re-adding websockets is cost with no payoff for a backend→UI status push. No two-way UI→backend need exists here.

## Decision

Option 2. Backend `EventStore.deriveStatus` is the authoritative active/idle source; seed it from the durable activity log on startup; include the status in the SSE snapshot; client and master both display the backend value; transport stays SSE; no separate persisted status file. Confirmed with the user across two clarifying rounds (scope = "full backend move"; transport = "keep SSE, just move logic to backend").

## Open questions

- None blocking. Implementation should confirm the server `deriveStatus` mapping matches the master's `deriveIdleStatus` (last event `Phase/done` → idle, else active) before removing the master's local copy, so consolidation is behavior-preserving.

## Sources

- `packages/taskflow/src/dashboard/server/index.ts` — `transport.onConnection` snapshot (~1635); `buildProjectState` (~448); `GET /log/status` (~1497) already exposes `eventStore.getStatus()`.
- `packages/taskflow/src/dashboard/server/event-stream.ts` — `EventStore` init `status:"idle"` (~48), `deriveStatus` (~35).
- `packages/taskflow/src/dashboard/server/activity.ts` — `ActivityEngine.start()` seeds from durable JSONL log (N225, ~28-47).
- `packages/taskflow/src/dashboard/client/store.ts` — `agentStatus:"idle"` default (~52), `applySnapshot` (~64).
- `packages/taskflow/src/dashboard/client/useDashboardStream.ts` — snapshot/activity/status handlers (~46-94).
- `packages/taskflow/src/dashboard/client/activity.ts` — `claudeStatusFromEvent` (~57).
- `packages/taskflow/src/master/overview.ts` — `deriveIdleStatus` (~397), `renderActivityMini` (~432).
- Transport is native SSE (`server/transport.ts` `SseTransport`); socket.io removed in N83. Durable feed from N225.

## Handoff brief

Type `fix`, priority `medium`, tags `dashboard,activity,sse,backend`. Make the backend the single source of truth for active/idle: seed the EventStore status from the durable activity log at startup, add the derived status to the initial SSE snapshot, have the dashboard client seed `agentStatus` from the snapshot, and point the master at the backend-provided status — removing/redirecting the duplicated derivations. Keep SSE (no websocket); no separate persisted status file; don't touch the activity feed rows. Verify: fresh load and post-restart both show the correct status, and master + dashboard agree.
