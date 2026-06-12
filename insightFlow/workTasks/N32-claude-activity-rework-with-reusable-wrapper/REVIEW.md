# N32 — Claude activity rework with reusable wrapper — Review

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **Tab switching lacks animation** — switching between "Claude Activity" and "Recent Activity" tabs should be animated (fade or slide). Currently there is no transition when panes show/hide.
   - File: `packages/taskflow/src/server/dashboard.ts` — `switchActTab()` function and `.act-pane` CSS
   - Fix: Add CSS transition (e.g. `opacity` fade) to `.act-pane` and animate the switch in `switchActTab()`.

2. **Activity item border should be full border, not left-only** — "border not only left just all border 1px solid" — the `.act-item` wrapper should have a full `1px solid <current color>` border on all sides, not just the left border stripe.
   - File: `packages/taskflow/src/server/dashboard.ts` — `actItemHtml()` and `.act-item` CSS
   - Fix: Change `border-left: 3px solid transparent` in `.act-item` to `border: 1px solid transparent` and update `actItemHtml()` to set `border-color` (not `border-left-color`) inline.

3. **"by agent" text should be white** — the agent/source label (e.g. "by task-git") in both Recent Activity and Claude Activity items is currently muted/grey (`var(--text-muted)`). It should be white (`var(--text)`).
   - File: `packages/taskflow/src/server/dashboard.ts` — inline style on the "by" span in the timeline render inside `render()` and in `renderActivityItemHtml()`
   - Fix: Change `color:var(--text-muted)` to `color:var(--text)` on the "by …" span.

4. **Date/timestamp text should be white** — the relative time/date label on each activity item is currently muted. It should be white (`var(--text)`).
   - File: `packages/taskflow/src/server/dashboard.ts` — `.activity-time` CSS class and inline `color:var(--text-muted)` on time spans in `render()` timeline items
   - Fix: Change `.activity-time { color: var(--text-muted) … }` to `color: var(--text)` and update the inline style on the timestamp span in the timeline rows.

5. **Claude Activity "active/idle" badge missing initial state** — the `activity-status` badge inside the Claude Activity tab button currently shows nothing on load. In the old sidebar design the badge defaulted to showing "idle" as soon as the panel rendered. It should show "idle" by default and switch to "active" when events arrive, exactly as before.
   - File: `packages/taskflow/src/server/dashboard.ts` — `updateActivityStatus()` and initialisation in the `activityEnabled` JS block
   - Fix: Call `updateActivityStatus('idle')` once during init so the badge is visible from the start.

### Suggestions (non-blocking)

- None.

### Notes

- Review covers the visual output of all four tasks (N29–N32) implemented together in a single file. All blockers are in `packages/taskflow/src/server/dashboard.ts`.
- Blocker 5 added in a follow-up review pass before fixes were applied.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **Activity item border should be bottom-only, not full border — both tabs** — "this border is soo cognitive overload please border should be only border bottom 1px solid also for the Claude activity item should be same!" — the `.act-item` wrapper currently has a full `1px solid` border on all sides. Both the Recent Activity tab and the Claude Activity tab use `actItemHtml()` / `.act-item`, so the fix must cover both.
   - File: `packages/taskflow/src/server/dashboard.ts` — `.act-item` CSS and `actItemHtml()`
   - Fix: Change `border: 1px solid transparent` in `.act-item` to `border-bottom: 1px solid transparent`; update `actItemHtml()` to set `border-bottom-color:` (not `border-color:`) inline. This single change fixes both tabs since they share the same wrapper.

### Suggestions (non-blocking)

- None.

### Notes

- All other Round 1 blockers (animation, white text, idle badge) remain resolved — this is the only remaining fix.
- Clarification added after initial Round 2 record: fix must apply to Claude Activity items as well (both tabs share `actItemHtml()` so one code change covers both).


---

## AI Review — Round 1

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

N32 reworks Claude Activity items to use the shared `.act-item` wrapper via `prependActivityItem()` and `eventColor()`. The structural goal is achieved — items use `.act-item` class, get a color derived from event type, and have a tinted background. Two issues need fixing before approval: the Round 2 human blocker (border-bottom only) is still unresolved in the file, and `prependActivityItem()` sets `borderLeftColor` directly while `actItemHtml()` sets `borderColor` — these diverged after the Round 1 human fix and must both be updated to `borderBottomColor` in the Round 2 fix pass.

### Checklist verification

- [x] `eventColor(ev)` helper added, covers all tool types — pass (lines 830–826)
- [x] `prependActivityItem()` sets inline styles using `eventColor()` and `hexToRgb()` — pass (lines 844–848)
- [x] `prependActivityItem()` uses class `act-item` — pass (line 846)
- [ ] All return paths in `renderActivityItemHtml()` wrapped with `actItemHtml(eventColor(ev), ...)` — **not done**; `renderActivityItemHtml()` returns raw inner HTML and the `act-item` wrapper is applied in `prependActivityItem()` via DOM. Functionally equivalent for the prepend path, but the checklist item is not met.
- [x] `querySelectorAll('.act-item')` used in `trimActivityFeed()` — pass (line 856)
- [x] `.activity-feed` CSS updated to flex column with gap — pass (line 111)
- [x] `.activity-item` CSS wrapper rule removed — pass (no match in source)

### Blockers

1. **Round 2 human blocker unresolved — border-bottom only** — The current `.act-item` CSS has `border: 1px solid transparent` and `actItemHtml()` sets `border-color:` inline. The human review Round 2 requires `border-bottom: 1px solid transparent` in CSS and `border-bottom-color:` in `actItemHtml()`.
   - File: `dashboard.ts` line 119 (`.act-item` CSS), line 299 (`actItemHtml()`)
   - Fix: `border: 1px solid transparent` → `border-bottom: 1px solid transparent`; `border-color:` → `border-bottom-color:` in `actItemHtml()`.

2. **`prependActivityItem()` sets `borderLeftColor` — inconsistent with `actItemHtml()`** — After the Round 1 fix changed CSS from `border-left` to `border`, `prependActivityItem()` still writes `item.style.borderLeftColor` (line 847). This means Claude Activity items only color their left border while Recent Activity items (via `actItemHtml`) color all four sides. Both must use `borderBottomColor` once the Round 2 fix lands.
   - File: `dashboard.ts` line 847
   - Fix: `item.style.borderLeftColor = color` → `item.style.borderBottomColor = color`.

### Non-blocking

- `renderActivityItemHtml()` not wrapped in `actItemHtml()` (checklist item). The outer wrapper is applied in `prependActivityItem()` instead. This works for the current code path but if a future caller invokes `renderActivityItemHtml()` directly it won't get the wrapper. Consider renaming to `renderActivityItemInner()` to make the contract explicit — low priority.

### Security & edge cases

- All string interpolation in `renderActivityItemHtml()` uses `escHtml()` on user-derived fields. Safe.

### Notes

- Both blockers will be fixed together in the next fix pass targeting the Round 2 human review. One change to `actItemHtml()` + one to `prependActivityItem()` + one to `.act-item` CSS covers everything.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None.

### Notes

- "approved!" — all previous blockers resolved (border-bottom, animation, white text, idle badge).


---

## AI Review — Round 2

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**Verdict:** approved

### Summary

All blockers from AI Review Round 1 and Human Review Rounds 1–3 are confirmed resolved. The three `border-bottom` fixes (CSS, `actItemHtml()`, `prependActivityItem()`) are consistent and correct. Build passes. No new issues found.

### Checklist verification

- [x] `eventColor(ev)` helper added, covers all tool types — pass (line 830)
- [x] `prependActivityItem()` sets inline styles using `eventColor()` and `hexToRgb()` — pass (lines 844–848); now uses `borderBottomColor` consistently
- [x] `prependActivityItem()` uses class `act-item` — pass (line 846)
- [ ] All return paths in `renderActivityItemHtml()` wrapped with `actItemHtml()` — still not done; outer wrapper remains in `prependActivityItem()`. Functionally correct, acknowledged as non-blocking in prior review.
- [x] `querySelectorAll('.act-item')` used in `trimActivityFeed()` — pass (line 856)
- [x] `.activity-feed` CSS updated to flex column with gap — pass (line 111)
- [x] `.activity-item` CSS wrapper rule removed — pass

### Blockers

None.

### Non-blocking

- `renderActivityItemInner()` rename suggestion from Round 1 remains open — still low priority, no action needed for approval.

### Security & edge cases

No changes to data paths. All prior `escHtml()` coverage intact.

### Notes

- Verified: `.act-item` CSS line 119 → `border-bottom: 1px solid transparent` ✓
- Verified: `actItemHtml()` line 299 → `border-bottom-color:` ✓
- Verified: `prependActivityItem()` line 847 → `item.style.borderBottomColor` ✓
- All three paths (CSS default, HTML string, DOM direct) are now consistent.

### Notes
