# N129 — Kanban renders columns from flow status sets

**Type:** rework
**Priority:** medium
**Created:** 2026-06-15

## Problem

- The kanban columns are hardcoded canonical statuses (`COLUMNS` in `lib.ts`). With flows declaring their own `statuses` (N128), the board should render from the union of all flows' status sets so a custom flow's stages appear as columns.

## Goal

1. Kanban columns are derived from the **union of all flows' `Project.statuses`** (custom + the default's canonical set), preserving each flow's order; canonical-only workspaces look **identical to today**.
2. Tasks group into the column matching their `status`; each task card still shows its flow (N116).
3. A status with no column (orphan) degrades gracefully (a catch-all column or a note).
4. Columns reflect added/removed flow statuses without code changes.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/lib.ts` — replace static `COLUMNS` with a builder over the flows' `statuses` (fetched from `/api/projects` + per-flow statuses).
- `dashboard/client/` Kanban — consume the derived columns.
- Server: expose each flow's `statuses` (extend `/api/projects` or `/api/project`).
- Tests: default-only → today's columns; a custom flow adds its columns; orphan status handled.

### Out of scope

- The status data model (N128). Badge styling (N130). The transition engine (N131+).
- Per-task drag-to-transition (out of scope; board is read-only as today).

## Implementation plan

1. **Column builder** — union of flow statuses, ordered, deduped; map canonical → today's column grouping for parity.
2. **Render** — Kanban consumes derived columns; group tasks by status; show flow on cards.
3. **Graceful** — orphan statuses → catch-all.
4. **Tests** — parity + custom columns + orphan.

## Verification

- `pnpm build` + suite green; a default-only workspace's board is unchanged; a workspace with a custom flow shows its columns.
- Tasks land in the right column; cards show flow.

## Notes

- Depends on N128. Reuses N116 task.flowId. See N119/ANALYSIS.md.
- Parity for default-only is the safety bar.
