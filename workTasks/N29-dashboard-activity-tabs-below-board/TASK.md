# N29 — Dashboard activity tabs below board

**Type:** feat
**Priority:** medium
**Created:** 2026-05-25

## Problem

- Claude Activity lives in a 340 px collapsible sidebar and Recent Activity is a loose card below the board. They have no shared navigation and the sidebar wastes horizontal space on narrow screens.
- Merging both into a single full-width tabbed panel below the board makes both feeds equally discoverable and gives room to redesign their item layouts.

## Goal

1. Remove the `activity-aside` sidebar from the layout.
2. Add a full-width tab bar with two tabs directly below the kanban/timeline area: **Claude Activity** (default active) and **Recent Activity**.
3. Clicking a tab shows its pane; the other pane is hidden.
4. The activity-feed div moves into the Claude Activity pane; the recent-events div moves into the Recent Activity pane.
5. The layout becomes single-column — no horizontal aside — so `main-content` stretches to full width.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — HTML structure (`getDashboardHtml`), CSS (`CSS` const), JS (`getScript`).

### Out of scope

- Server-side endpoints (`index.ts`), data fetching logic, item-level rendering (those are N31/N32).
- The collapse button and aside CSS can be removed entirely; no backwards-compat stub needed.

## Implementation plan

1. **Update HTML structure** in `getDashboardHtml`:
   - Remove `<aside class="activity-aside" ...>` block (both the activityEnabled-guarded and the closing `</aside>`).
   - Below `<div class="timeline" id="timeline"></div>` add:
     ```html
     <div class="act-tabs" id="act-tabs">
       <div class="act-tab-bar">
         <button class="act-tab active" data-pane="claude" onclick="switchActTab('claude')">Claude Activity</button>
         <button class="act-tab" data-pane="recent" onclick="switchActTab('recent')">Recent Activity</button>
       </div>
       <div class="act-pane" id="act-pane-claude">
         <div class="activity-feed" id="activity-feed"></div>
       </div>
       <div class="act-pane" id="act-pane-recent" style="display:none">
         <div class="recent-events" id="recent-events"></div>
       </div>
     </div>
     ```
   - Remove standalone `<div class="recent-events" id="recent-events"></div>` that was directly in `main-content`.
   - Wrap the whole block in `activityEnabled ? ... : ""`.

2. **Update layout CSS**: Change `.layout` from `display:flex;gap:24px` to single-column so `main-content` fills 100 %. Remove or comment out `.activity-aside` and related `.collapsed` rules.

3. **Add tab CSS** in the `CSS` const:
   ```css
   .act-tabs { margin-top: 24px; }
   .act-tab-bar { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 0; }
   .act-tab { flex: 1; background: none; border: none; color: var(--text-muted); font: inherit; font-size: 13px; padding: 10px 0; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
   .act-tab:hover { color: var(--text); }
   .act-tab.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
   .act-pane { padding: 16px 0; }
   ```

4. **Add JS tab switcher** in `getScript()` before the `Init` block:
   ```js
   function switchActTab(name) {
     document.querySelectorAll('.act-tab').forEach(function(t) {
       t.classList.toggle('active', t.dataset.pane === name);
     });
     document.querySelectorAll('.act-pane').forEach(function(p) {
       p.style.display = p.id === 'act-pane-' + name ? '' : 'none';
     });
   }
   ```

5. **Remove aside-specific JS** — delete or guard any code referencing `activity-aside`, `activity-collapse-btn`, `toggleActivityPanel`.

6. **Build and verify**: `pnpm --dir packages/taskflow run build` must pass; open dashboard and confirm two tabs render below the kanban, Claude Activity is default visible, tab switch shows/hides panes.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- `pnpm play` → dashboard at http://localhost:6006 — no sidebar, tab bar visible below kanban.
- Clicking "Recent Activity" tab shows that pane; clicking "Claude Activity" returns to the default.

## Notes

- Depends on: N30 (wrapper CSS), N31 (Recent Activity content), N32 (Claude Activity content). Can be merged first — panes will just show their existing raw markup until N31/N32 land.
- The `activityEnabled` guard must still wrap the entire tabs section so the dashboard degrades cleanly when activity is disabled.
