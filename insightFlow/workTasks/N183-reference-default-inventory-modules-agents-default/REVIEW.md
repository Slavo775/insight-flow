# N183 — Reference: default inventory (modules, agents, default flow, master server) — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-25
**PR:** (no PR yet)
**Verdict:** approved

## Human Review

> "approved screenshot we will added later"

Approved as part of the documentation batch (N181–N185). New `built-ins/`
reference group (modules, agents, default flow, master server) + the
`sync-docs.mjs` position fix that moves the synced Reference group last.

### Blockers

None.

### Notes

- Counts verified against source: 10 agents, 3 locked ids, 6 activity hooks, 13
  handovers, default flow 10 agents / 13 edges / 15 statuses. Build clean.
- Only source change in the batch: the one-line `sync-docs.mjs` position
  integer (6 → 9). This **resolves the N181 sidebar deviation**.

## Review Fix — 2026-06-25 (AI review follow-up)

**Blocker fixed** (`built-ins/master-server.md:52-56`): the admonition falsely
claimed the single-project dashboard "uses Socket.IO". Corrected — both servers
stream over **native SSE** (single-project at `/sse`, master at `/events`).
Verified against `dashboard/server/transport.ts` + `client/useDashboardStream.ts`
(`new EventSource("/sse")`); `socket.io` is not a dependency. Build + prettier
clean; no false Socket.IO claim remains in the docs.
(Note: applied directly on the approved working tree; `fix-start/fix-end` no-op
from `approved` status, so the task remains `approved` with the fix in place.)

**Human re-approved post-fix (2026-06-25):** "approved". The reported crash on
`/docs/2.0/overview` was a stale dev-server artifact (cleared cache + fresh
server resolved it); the production build renders the versioned page correctly.
