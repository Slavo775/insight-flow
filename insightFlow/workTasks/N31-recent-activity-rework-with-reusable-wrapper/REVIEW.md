# N31 — Recent activity rework with reusable wrapper — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** (no PR — implemented on feat/N29-dashboard-activity-tabs)
**Verdict:** approved

## Summary

N31 reworks the Recent Activity tab to display task lifecycle transitions as styled `.act-item` rows. The implementation departs from the spec's approach (`loadRecentEvents` / `isLifecycleEvent` / `renderRecentEvents` fetching `/api/activity`) and instead populates the `#timeline` div from `statusHistory` arrays already present in the task shard data inside `render()`. This is a better approach — no extra network call, data is already in memory, and every status transition is guaranteed to be a lifecycle event. The stated goal (colored wrappers, taskId → status → by source → time format) is fully delivered. Build passes.

## Checklist verification

- [ ] `loadRecentEvents()` fetches from `/api/activity` — **not implemented** (spec deviation: uses `statusHistory` in `render()` instead — see Notes)
- [ ] `isLifecycleEvent(ev)` helper added — **not implemented** (not needed with statusHistory approach)
- [x] Recent Activity renders `.act-item-list` / `actItemHtml(color, inner)` markup — pass (lines 361–370)
- [x] Each item shows: taskId badge → "→" → status badge → "by source" → relative time — pass (lines 363–368)
- [x] Status badge background and border use `taskStatusColor(status)` color — pass
- [x] Old `.recent-event-item` CSS removed — pass (no match in source)
- [x] Empty state renders a text message when no lifecycle events exist — pass (lines 358–360)

## Non-blocking

- The `formatTime()` function used for timestamps in the timeline produces a locale date string (e.g. "May 25, 03:15 PM"), not a relative time like "5m ago". Claude Activity items use `relativeTime()` with `data-ts` for live refresh. Recent Activity items could do the same for consistency — low priority.

## Security & edge cases

- `escHtml()` is called on all user-derived fields (`taskId`, `status`, `by`) — safe.
- `new Date(b.at).getTime()` sort is used on statusHistory timestamps; malformed `at` values would produce `NaN` and sort unpredictably, but these are internal tracker fields, not user input.

## Notes

- Spec deviation is intentional and appropriate: `statusHistory` is authoritative for lifecycle transitions; `/api/activity` carries session hook events which are noisier and require the `isLifecycleEvent` filter to extract the same data. The statusHistory approach is simpler and more reliable.
- The `by` field in statusHistory records which agent/skill performed the transition (e.g. `task-git`, `task-implement`) — exactly the "by source" label the spec asked for.
