# N129 — Kanban renders columns from flow status sets — Checklist

## Done criteria

- [x] Kanban columns derived from flows' statuses (`core/kanban.buildColumns`,
      union over `/api/projects` statuses; `useFlowColumns` hook + cache)
- [x] Default-only board identical to today (canonical statuses keep the 6-column
      grouping; `CANONICAL_COLUMNS` is the fallback while statuses load)
- [x] Tasks group by status; cards show flow for non-default flows; orphan
      statuses collected into a trailing "Other" column
- [x] No code change to add a flow's columns (data-driven from `Project.statuses`)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (199; +4 in `test/kanban-columns.test.mjs`)
- [x] No regressions in affected area (default-only parity asserted; build green)

## Verification

- [x] default parity + custom-flow columns + dedup + orphan handling verified by
      `test/kanban-columns.test.mjs`
