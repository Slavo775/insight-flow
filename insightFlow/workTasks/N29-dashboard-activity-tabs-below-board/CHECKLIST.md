# N29 — Dashboard activity tabs below board — Checklist

## Done criteria

- [ ] `activity-aside` sidebar and its CSS/JS removed from `dashboard.ts`
- [ ] Tab bar with "Claude Activity" and "Recent Activity" renders below the kanban/timeline
- [ ] "Claude Activity" tab is active by default; `activity-feed` div is inside its pane
- [ ] "Recent Activity" tab is hidden by default; `recent-events` div is inside its pane
- [ ] `switchActTab()` correctly shows/hides panes and updates active tab style
- [ ] Layout is single-column — `main-content` stretches to full width with no aside gap

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0 (TypeScript compile + bundle)
- [ ] No TypeScript errors reported

## Verification

- [ ] `pnpm play` → http://localhost:6006 shows tab bar below kanban, no sidebar
- [ ] Clicking "Recent Activity" tab shows the pane; clicking "Claude Activity" shows the other
- [ ] When `activityEngine.enabled: false` in config, tabs section is absent (no layout breakage)
