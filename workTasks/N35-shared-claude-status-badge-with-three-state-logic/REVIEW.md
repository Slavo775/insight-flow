# N35 — Shared Claude status badge with three-state logic — Review

## AI Review — Round 1

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

`claudeStatusFromEvent()` and `updateActivityStatus()` are correctly wired. CSS for `permission-needed` present. Two blockers: the `done` → idle mapping is wrong (human review R2 confirmed), and `tool-approved` → active transition is missing.

### Checklist verification

- [x] `.activity-status.permission-needed` CSS rule added — ✅ present
- [x] `claudeStatusFromEvent(ev)` defined in base script — ✅ lines 325–331
- [x] `start` → `active` — ✅
- [x] `agent-idle` hook → `idle` — ✅ line 329
- [ ] `done` → `idle` — ❌ human review R2 explicitly flags this as wrong (see N37 REVIEW.md round 2); `done` is a task-tracker event, not a Claude session signal; should be removed
- [x] `approval-required` → `permission-needed` — ✅ line 328
- [x] `updateActivityStatus()` handles all three states including `permission-needed` — ✅ lines 1101–1113
- [x] Event handler calls `claudeStatusFromEvent` → `updateActivityStatus` — ✅ `addActivityEvent` lines 860–864
- [x] `updateActivityStatus('idle')` called on init — ✅ line 1127

### Blockers

1. **`done` event must not drive idle state** — `dashboard.ts` line 327: `if (ev.tool === 'Event' && ev.action === 'done') return 'idle'`. The `done` event is emitted by agents when a task-tracker operation completes (e.g. notification trigger, `fix-end`). It does not represent Claude going idle — that signal comes from the `agent-idle` hook. Keeping this mapping causes the badge to flip to idle on every tracker operation, which is visually wrong and contradicts human review R2.
   _Fix: remove line 327._

2. **Missing `tool-approved` → `active` transition** — after a permission prompt, the user grants approval and Claude resumes. The `tool-approved` hook event fires (color `#22c55e` in `hookEventColor`), but `claudeStatusFromEvent()` has no case for it, leaving the badge stuck on 🚨 permission-needed.
   _Fix: add `if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'tool-approved') return 'active';` in `claudeStatusFromEvent()`._

### Non-blocking

- None.

### Security & edge cases

- None.

### Notes

- Both blockers also affect N37 (title) since `updatePageTitle` is called from the same `addActivityEvent` handler.
