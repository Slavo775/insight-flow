# N262 — Redesign Agent Activity pane (ActivityFeed) as LIVE STREAM timeline — Checklist

## Done criteria

- [x] `ActivityFeed` → "LIVE STREAM" header (pulsing green dot + label, event count on the right) + an `<ol>` timeline
- [x] Vertical rail (`.act-stream::before`) with per-event colored dot markers on it
- [x] `ActivityItem` → timeline row: colored pill (event kind) + label + "Xm ago" time + optional muted mono target path
- [x] `describeEvent(ev)` consolidates all real event kinds (Activity / Event / hook / Phase / Skill / Tool / default), each keeping its `eventColor` + text (no event types lost)
- [x] Provider badge (cursor/other agent) preserved
- [x] Empty state preserved (hook-not-installed / waiting messages)
- [x] New `.act-stream*` CSS added; dead `.activity-feed` rule removed; `.act-item`/`.act-item-list` left intact for the Timeline
- [x] Pane sits in the N261 `.act-panel` (no double border); header spans the panel via negative margin

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds
- [x] `npx tsc --noEmit` passes
- [x] ESLint clean (ActivityFeed + ActivityItem)
- [x] No regression: Status Transitions (Timeline) tab unchanged — still renders (30 rows verified)

## Verification

- [x] Agent Activity pane shows "LIVE STREAM" + count, rail + colored dots, pills (tool-requested cyan, tool-approved green, approval-required amber, tool green…), labels, target paths, "Xm ago" — verified in-browser (50 events)
- [x] Switching to Status Transitions still works (Timeline untouched); switching back works
- [x] No app console errors; verified on a fresh repo build (global insight-flow is stale)
