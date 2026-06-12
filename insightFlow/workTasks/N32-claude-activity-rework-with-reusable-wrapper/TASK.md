# N32 — Claude activity rework with reusable wrapper

**Type:** rework
**Priority:** medium
**Created:** 2026-05-25

## Problem

- Claude Activity items (`.activity-item`) use their own bespoke CSS: no consistent height, no left-border status color, no gap between items — just small padded rows with an icon. The result is visually inconsistent with the new Recent Activity design (N31).
- After N29/N30/N31, both feeds sit in adjacent tabs. If they look completely different it undermines the unified tab UI.

## Goal

1. Replace `.activity-item` styling with `.act-item` from N30 so every Claude Activity row is 60 px min-height with 10 px gap.
2. Apply `actItemHtml(color, inner)` in `renderActivityItemHtml()`: the border/background color comes from the event type using the existing `hookEventColor()` map (for hook events) or a constant neutral color for tool/phase events.
3. The existing icon + badge + label + time content is preserved; only the wrapper changes.
4. CSS for `.activity-item` can be removed or reduced to a compat shim.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — `renderActivityItemHtml()`, `prependActivityItem()`, `trimActivityFeed()`, and `.activity-item` CSS in the CSS const.

### Out of scope

- Icon/badge color logic inside `renderActivityItemHtml()` — keep `hookEventColor()`, `toolIcon()`, badge class names as-is. Only the outer wrapper changes.
- `renderRecentEvents()` — that is N31.
- `activity-aside` sidebar — removed by N29.

## Implementation plan

1. **Update `prependActivityItem()`**: Change `item.className = 'activity-item'` to `item.className = 'act-item'`; wrap the inner HTML call:
   ```js
   var color = eventColor(ev);    // see step 2
   item.setAttribute('style', 'border-left-color:' + color + ';background:rgba(' + hexToRgb(color) + ',0.08)');
   item.className = 'act-item';
   item.innerHTML = renderActivityItemHtml(ev);
   ```

2. **Add `eventColor(ev)` helper** that picks the right color per event type:
   ```js
   function eventColor(ev) {
     if (ev.tool === 'Event' && ev.source === 'hook') return hookEventColor(ev.action || '');
     if (ev.tool === 'Skill') return '#a855f7';          // purple
     if (ev.tool === 'Phase') return '#06b6d4';          // cyan
     if (ev.tool === 'Activity') return '#f59e0b';       // amber
     if (ev.tool === 'Tool') return '#22c55e';           // green (bash)
     return '#737373';
   }
   ```

3. **Update `renderActivityItemHtml()` return values**: Each branch currently returns a raw HTML string. These strings become the `innerHtml` argument to `actItemHtml()`. Wrap each branch:
   - Change every `return '<div class="activity-icon ...` to `return actItemHtml(eventColor(ev), '<div ...`)`.
   - The `.activity-icon` div, badge, and time span markup stays identical.

4. **Update activity feed container** in JS (`renderActivityEmptyState` / `trimActivityFeed`): `querySelectorAll('.activity-item')` → `querySelectorAll('.act-item')`. Same for any `feed.querySelector('.activity-idle')` if it uses `.activity-item`.

5. **Replace `.activity-item` in CSS const** with a forward-compat comment:
   ```css
   /* .activity-item replaced by .act-item (N32) */
   ```
   Keep `.activity-icon`, `.activity-badge-*`, `.activity-tool`, `.activity-time`, `.activity-file*` as-is — those are inner-element classes, not the wrapper.

6. **Update `.activity-feed` container CSS** to use flex gap instead of per-item padding:
   ```css
   .activity-feed { flex: 1; overflow-y: auto; padding: 4px 0; display: flex; flex-direction: column; gap: 10px; }
   ```

7. **Build and verify**: `pnpm --dir packages/taskflow run build` → open dashboard → Claude Activity tab shows items with colored left borders and 10 px gaps.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- `pnpm play` → Claude Activity tab — items are visually consistent with Recent Activity tab: 60 px height, 10 px gap, colored left border.
- Hook events (tool-approved, tool-requested, etc.) show their distinct colors (green, cyan, red, purple).
- Skill completed events show purple border.
- Activity (milestone) events show amber border.

## Notes

- Depends on N29 (tab structure) and N30 (helpers). Can be developed against the existing aside before N29 merges.
- Related: N31 (identical goals for Recent Activity side).
- The inner content structure (icons, badges, labels) must not change — this task is purely a wrapper/container restyle.
