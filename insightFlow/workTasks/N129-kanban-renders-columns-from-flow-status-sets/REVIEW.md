# N129 — Kanban renders columns from flow status sets — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`core/kanban.buildColumns` unions flow status sets: canonical statuses keep the
6-column grouping (`CANONICAL_COLUMNS`), each non-canonical custom status becomes
its own appended column (deduped across flows). `useFlowColumns` fetches projects
(cached, invalidated on custom-defs change). Kanban takes a `columns` prop with
the canonical fallback, collects orphans into a trailing "Other" column, and
shows the flow on non-default cards. Pure builder lives in core (testable).

## Checklist verification

- [x] Columns derived from flows' statuses; default-only == today (`kanban-columns.test.mjs`).
- [x] Custom statuses → own columns; dedup first-wins; orphans handled.
- [x] Cards show flow for non-default tasks; no code change to add a flow's columns.

## Blockers

None.

## Non-blocking

- Canonical columns always render first (custom appended), so a fully-custom-only workspace still shows the 6 (mostly empty) canonical columns since the default flow always exists. Reasonable, but a future "hide empty canonical columns" toggle could tidy it.

## Security & edge cases

- `__other__` column key could in theory collide with a status literally named `__other__` — implausible; fine. The lib.ts → core/kanban re-export keeps the client bundle decoupled (core/kanban is zod/fs-free; vite build clean).

## Notes

Depends on N128. Styling is N130.


## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-16
**Verdict:** Approved

### Notes

Human: "done create or via girhub and merge it into master"

Approved by the project owner; merging PR #99 into `main`.
