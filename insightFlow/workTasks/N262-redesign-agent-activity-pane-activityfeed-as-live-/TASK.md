# N262 — Redesign Agent Activity pane (ActivityFeed) as LIVE STREAM timeline

**Type:** feat
**Priority:** medium
**Created:** 2026-07-27

## Problem

After N261 gave the activity tabs proper ARIA + a bordered panel, the human noted the **Agent Activity pane content** still looked like the old flat tinted-row list, not the Lovable "LIVE STREAM" timeline (header + session, vertical rail with colored dot markers, event pills). N261 was scoped to the tab chrome only; this task redesigns the pane itself.

## Goal

1. `ActivityFeed` → a "LIVE STREAM" header (pulsing dot + label + event count) over a vertical-rail timeline.
2. `ActivityItem` → a timeline row: colored dot on the rail + a status-colored pill (event kind) + label + relative time + optional muted target path.
3. Keep every real event kind working (Activity / Event / hook / Phase / Skill / Tool / default), each with its `eventColor`.
4. No regression to the Status Transitions (Timeline) tab.

## Scope

### In scope
- `dashboard/client/ActivityFeed.tsx` — header + `<ol className="act-stream">`.
- `dashboard/client/ActivityItem.tsx` — `describeEvent(ev)` → `{color, pill, label, target}`; render the `<li>` row (dot + pill + label + time + target).
- `dashboard/client/styles.css` — add `.act-stream*` (header, rail, dot, pill, row, label, time, target); remove the dead `.activity-feed` class rule.

### Out of scope
- No change to `Timeline` / `.act-item` / `.act-item-list` (Status Transitions tab).
- No change to the tabs (N261), board (N260), header (N258), project-header card (N259), master, or the store.
- No change to the activity data model, `eventColor`, verbosity filter, or the empty-state messages.
- No new npm dependency.

## Implementation plan
1. `describeEvent(ev)` in `ActivityItem.tsx` — consolidate the former per-tool branches to `{color: eventColor(ev), pill, label, target}`.
2. Rewrite `ActivityItem` to the `<li>` timeline row (dot via inline `eventColor` tint; pill/label/time; target on a muted mono line).
3. Rewrite `ActivityFeed` — "LIVE STREAM" header (pulse + count) + `<ol className="act-stream">` (empty state preserved).
4. CSS — `.act-stream*` rules (rail via `::before`, colored dot/pill inline); `.act-panel` (N261) provides the outer frame; header spans it via negative margin. Remove dead `.activity-feed`.
5. Verify + quality gates.

## Verification
- Build + `tsc` + eslint pass.
- Agent Activity pane shows LIVE STREAM + count, rail + colored dots, event pills + labels + target paths + "Xm ago" (verified in-browser, 50 events).
- Status Transitions tab still renders (Timeline untouched). No app console errors.

## Notes
- Went straight to implementation at the human's request (skipping the separate `/task-fe-analyze` + `/task-fe-plan` gates), since the target design (Lovable AgentActivityPane) and the real code were already understood this session.
- Reuse: `eventColor` / `relativeTime` / `hexToRgb`, the `@keyframes pulse`, the N261 `.act-panel` frame, `ProviderBadge`, the empty-state helper.
- Design reference: Lovable `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — `AgentActivityPane` (LIVE STREAM header + rail + dot markers + colored pills).
- **Context:** N258 + N259 + N260 + N261 approved but uncommitted; N262 stacks on them.
