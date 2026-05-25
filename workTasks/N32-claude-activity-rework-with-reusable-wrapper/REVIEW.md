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
