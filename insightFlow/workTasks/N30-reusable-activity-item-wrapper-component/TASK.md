# N30 — Reusable activity item wrapper component

**Type:** feat
**Priority:** medium
**Created:** 2026-05-25

## Problem

- Claude Activity items and Recent Activity items each have bespoke CSS and HTML. There is no shared component — when either feed is restyled the other must be updated separately.
- Both feeds need the same visual treatment: 60 px min-height wrappers, 10 px gap between items, a colored left border and a lighter tinted background keyed to the task status.

## Goal

1. Define `.act-item` CSS class: `min-height: 60px`, flex row, `padding: 0 12px`, suitable for both feeds.
2. Define `.act-item-list` CSS class: `flex-direction: column; gap: 10px` — the container for lists of `.act-item`s.
3. Define `taskStatusColor(status)` JS function mapping every task status to its canonical hex color.
4. Define `actItemHtml(color, innerHtml)` JS helper that wraps content in an `.act-item` with inline `border-left` and `background` derived from `color`.
5. Both N31 (Recent Activity) and N32 (Claude Activity) can call these helpers without duplicating CSS.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — CSS const and `getScript()` function only.

### Out of scope

- Callers (N31, N32) — this task only adds the helpers; it does not update `renderRecentEvents` or `renderActivityItemHtml`.
- Server routes, type definitions, CLI commands.

## Implementation plan

1. **Add `.act-item` and `.act-item-list` to CSS const** in `dashboard.ts`:
   ```css
   .act-item-list { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
   .act-item { min-height: 60px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-radius: 6px; border-left: 3px solid transparent; font-size: 13px; }
   ```

2. **Add `taskStatusColor(status)` in `getScript()`** (place near `hookEventColor`):
   ```js
   function taskStatusColor(status) {
     var m = {
       'ready': '#94a3b8',
       'in-progress': '#f59e0b',
       'implemented': '#06b6d4',
       'reviewing': '#a855f7',
       'approved': '#22c55e',
       'fix-needed': '#ef4444',
       'fixing': '#dc2626',
       'fixed': '#22c55e',
       'pushed': '#16a34a',
       'merged': '#10b981',
       'changes-requested': '#f97316',
       'changes-implementing': '#fb923c',
       'changes-implemented': '#14b8a6'
     };
     return m[status] || '#737373';
   }
   ```

3. **Add `hexToRgb(hex)` helper** for background tinting:
   ```js
   function hexToRgb(hex) {
     var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
     return r + ',' + g + ',' + b;
   }
   ```

4. **Add `actItemHtml(color, innerHtml)` helper**:
   ```js
   function actItemHtml(color, innerHtml) {
     var rgb = hexToRgb(color);
     return '<div class="act-item" style="border-left-color:' + color + ';background:rgba(' + rgb + ',0.08)">' + innerHtml + '</div>';
   }
   ```

5. **Build**: `pnpm --dir packages/taskflow run build` must pass.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- Functions `taskStatusColor`, `hexToRgb`, `actItemHtml` exist in the served dashboard HTML source.
- After N31/N32 land, items in both tabs show colored left borders and tinted backgrounds.

## Notes

- Related: N29 (tab structure), N31 (Recent Activity caller), N32 (Claude Activity caller).
- Background opacity 0.08 gives a subtle tint readable on the dark `--bg` background.
- `taskStatusColor` must cover all statuses in `TaskStatus` union (`packages/taskflow/src/types.ts`); unknown statuses fall back to `#737373`.
