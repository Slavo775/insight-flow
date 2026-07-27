# N263 — Status Transitions pane → Lovable Lifecycle design (rail + from-to Badges) — Checklist

## Done criteria

### Data (from→to)
- [x] `TimelineEvent` extended with `from?: string`
- [x] Events built by index over each task's `statusHistory` (`from = statusHistory[idx-1]?.status`), then flattened + sorted newest-first, 30-cap kept — still cross-task

### Lifecycle look (reuse .act-stream*)
- [x] `.act-stream-head` header: "LIFECYCLE" title (no pulse dot) + a `Chip` transition count
- [x] `<ol className="act-stream">` with the rail; each `<li className="act-stream-item">` has a status-colored `.act-stream-dot`
- [x] Row: `Badge(from) → Badge(to)` when `from` exists, else just `Badge(to)`; `.act-stream-time` = `formatTime(at)` on the right
- [x] "Current" marker on the newest row (`events[0]`)
- [x] Muted second line: "by {by||'?'}" + taskId
- [x] Pills use `Badge` (statuses={flowStatuses}), NOT StatusPill
- [x] Empty state preserved

### CSS cleanup
- [x] `.act-item` + `.act-item-list` removed from styles.css (Timeline was the only consumer)
- [x] `.act-stream*` untouched; ActivityFeed/ActivityItem untouched

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds
- [x] `npx tsc --noEmit` passes
- [x] ESLint / prettier clean (pre-commit hook)
- [x] No new npm dependency

## Verification

- [x] Status Transitions tab: LIFECYCLE header + count, rail + status-colored dots, from→to Badge rows, "Current" on newest, time + "by X" + taskId
- [x] First-entry rows show a single Badge (no "undefined →")
- [x] Agent Activity tab (N262) still renders (shared `.act-stream*` intact)
- [x] No leftover `.act-item*` refs; no console errors; verified on a fresh repo build (global insight-flow is stale)
