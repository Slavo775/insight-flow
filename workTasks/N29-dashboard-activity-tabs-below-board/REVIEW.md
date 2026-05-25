# N29 — Dashboard activity tabs below board — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** (no PR — implemented on feat/N29-dashboard-activity-tabs)
**Verdict:** approved

## Summary

N29 removes the `activity-aside` sidebar and replaces it with a full-width tab bar below the kanban. The change is structural only: HTML, CSS, and a JS tab switcher. Risk is low — no data fetching or business logic changed. Build passes. All checklist items confirmed in the current `dashboard.ts`.

## Checklist verification

- [x] `activity-aside` sidebar and its CSS/JS removed — pass (no `aside` or `activity-aside` reference found in source)
- [x] Tab bar with "Claude Activity" and "Recent Activity" renders below kanban/timeline — pass (lines 50–61)
- [x] "Claude Activity" tab is active by default; `activity-feed` inside its pane — pass (line 52 `class="act-tab active"`, line 56)
- [x] "Recent Activity" tab hidden by default; timeline div inside its pane — pass (line 58 `style="display:none"`)
- [x] `switchActTab()` correctly shows/hides panes and updates active tab — pass; additionally got opacity fade animation in N32 fix pass
- [x] Layout is single-column with no aside gap — pass (`main-content` is the only flex child)

## Non-blocking

- `.layout { display: flex; gap: 16px; align-items: flex-start; }` retains `gap:16px` which is dead CSS now that the aside is gone. Not harmful since there's only one flex child, but can be cleaned up.

## Security & edge cases

None — pure structural HTML/CSS/JS, no user-controlled data paths added.

## Notes

- `switchActTab()` enhanced with opacity transition during the N32 fix pass — not part of N29 scope but a clean improvement.
- When `activityEngine.enabled: false`, the tabs section is omitted and a bare `#timeline` div is placed inline — degradation is clean (line 62).
