# N31 — Recent activity rework with reusable wrapper

**Type:** rework
**Priority:** medium
**Created:** 2026-05-25

## Problem

- The current `renderRecentEvents()` function shows raw hook events (session-start, tool-approved, etc.) as a compact flat list with only a color dot and text label. There is no task-status color coding, no 60 px wrapper, and no transition format ("N28 → merged by task-git").
- The visual style does not match the intended design: colored left border and lighter tinted background per task status, same wrapper height as Claude Activity items.

## Goal

1. Rewrite `renderRecentEvents()` in `getScript()` to produce `.act-item-list` / `.act-item` markup (from N30).
2. Each item displays: `taskId` badge → colored `status` badge → "by `skill/source`" label + relative timestamp.
3. Item border and background color are derived from `taskStatusColor(status)` via `actItemHtml()`.
4. The transition format matches Image 1 reference: `N28 → merged  by task-git  <time>`.
5. Data source: `/api/activity` events filtered to those with `taskId` and a meaningful `status` or `action` that represents a task lifecycle change (tool `"Event"` + `action: "done"`, or `tool: "Skill"` + `action: "completed"`, or `tool: "Activity"` milestone messages).

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — `renderRecentEvents()` function and `loadRecentEvents()` fetch inside `getScript()`.
- CSS for `.recent-event-item`, `.recent-events-list`, `.recent-events-header` can be removed/replaced by `.act-item-list` / `.act-item`.

### Out of scope

- Server-side API endpoints — use existing `/api/activity` or `/api/session-events` as-is.
- The `groupConsecutiveEvents` and `hookEventColor` helpers — those belong to Claude Activity (N32).
- Adding new backend data fields; work only with what existing events already carry.

## Implementation plan

1. **Determine data source**: In `loadRecentEvents()`, switch from `/api/session-events` to `/api/activity`. Filter returned events for those that represent task lifecycle transitions — specifically events where `taskId` exists AND one of:
   - `tool === "Event"` and `action` is a milestone (`"done"`, `"review-end"`, `"fix-end"`, `"git-end"`, `"implemented"`, `"approved"`, `"fix-needed"`)
   - `tool === "Activity"` (message-based milestones)
   - `tool === "Skill"` and `action === "completed"`
   Take the most recent 20 such events.

2. **Extract display fields** per event:
   - `taskId`: `ev.taskId` or parsed from `ev.message`
   - `statusLabel`: `ev.status || ev.action || ev.message || ev.skill || ""`
   - `byLabel`: `ev.skill || ev.tool || ev.source || ""`
   - `color`: `taskStatusColor(statusLabel)`

3. **Rewrite `renderRecentEvents(events)`**:
   ```js
   function renderRecentEvents(events) {
     var el = document.getElementById('recent-events');
     if (!el) return;
     // filter step (from plan item 1)
     var items = events.filter(function(ev) { return ev.taskId && isLifecycleEvent(ev); }).slice(0, 20);
     if (items.length === 0) {
       el.innerHTML = '<div class="act-item-list"><div class="activity-empty-state">...</div></div>';
       return;
     }
     var rows = items.map(function(ev) {
       var status = ev.status || ev.action || '';
       var color = taskStatusColor(status);
       var inner =
         '<span style="font-weight:700;color:var(--accent)">' + escHtml(ev.taskId) + '</span>' +
         '<span style="color:var(--text-muted);margin:0 4px">→</span>' +
         '<span class="activity-badge" style="background:rgba(' + hexToRgb(color) + ',0.18);color:' + color + ';padding:2px 8px;border-radius:4px;font-size:12px">' + escHtml(status) + '</span>' +
         (ev.skill || ev.tool ? ' <span style="color:var(--text-muted);font-size:11px">by ' + escHtml(ev.skill || ev.tool) + '</span>' : '') +
         '<span class="activity-time" style="margin-left:auto" data-ts="' + escHtml(ev.ts) + '">' + relativeTime(ev.ts) + '</span>';
       return actItemHtml(color, inner);
     });
     el.innerHTML = '<div class="act-item-list">' + rows.join('') + '</div>';
   }
   ```

4. **Add `isLifecycleEvent(ev)` helper** (referenced above):
   ```js
   var LIFECYCLE_ACTIONS = ['done','review-end','fix-end','git-end','implemented','approved','fix-needed','fixing','fixed','pushed','merged','completed'];
   function isLifecycleEvent(ev) {
     if (ev.tool === 'Activity') return !!ev.taskId;
     if (ev.tool === 'Skill' && ev.action === 'completed') return !!ev.taskId;
     if (ev.tool === 'Event') return LIFECYCLE_ACTIONS.indexOf(ev.action) !== -1;
     return false;
   }
   ```

5. **Remove old `recent-event-item` CSS** from the CSS const; it's replaced by `.act-item` from N30.

6. **Build and verify**: `pnpm --dir packages/taskflow run build` → open dashboard → Recent Activity tab → items show colored wrappers with task transitions.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- `pnpm play` → dashboard → Recent Activity tab shows `.act-item`-wrapped rows with colored left borders.
- Each row format: `N28 → merged  by task-git  5m`.
- Empty state renders without errors when no lifecycle events exist.

## Notes

- Depends on N29 (tab container) and N30 (helpers). Can be tested independently by temporarily placing `recent-events` div directly in the page.
- If `/api/activity` returns no events with `taskId`, the empty state will show — this is correct.
- Color map from N30: merged=#10b981 (teal-green), pushed=#16a34a, reviewing=#a855f7 (purple), fix-needed=#ef4444 (red), fixing=#dc2626, approved=#22c55e, etc.
