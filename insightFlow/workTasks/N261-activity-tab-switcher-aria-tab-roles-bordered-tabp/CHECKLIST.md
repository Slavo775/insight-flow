# N261 — Activity tab switcher — ARIA tab roles, bordered tabpanel, Status Transitions label — Checklist

## Done criteria

### ARIA tab semantics
- [x] `.act-tab-bar` has `role="tablist"` + `aria-label`
- [x] Each tab `Button` has `role="tab"`, `aria-selected={active}`, `id` (tab-agent/tab-status), `aria-controls` (its panel id)
- [x] Each pane wrapper has `role="tabpanel"`, `id` (panel-agent/panel-status), `aria-labelledby` (its tab id)
- [x] Inactive panel uses the `hidden` attribute (not inline `display:none`)

### Label + panel
- [x] Second tab renamed "Recent Activity" → "Status Transitions"; first tab stays "Agent Activity" + its status badge
- [x] Active pane sits in a bordered/rounded surface panel (matches N260 BoardFrame tokens: --border, radius.lg, --surface); tab-bar underline kept

### Unchanged (verify no regression)
- [x] `actTab` state + both panes (`ActivityFeed`, `Timeline`) unchanged internally
- [x] Status badge (`activityStatusView` + `.activity-status`) unchanged (active/idle/permission-needed kept)
- [x] Engine-off branch: no tabs, just Timeline (behavior unchanged)
- [x] `Button.tsx` unchanged (props pass through as-is)

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds (dashboard + master)
- [x] `npx tsc --noEmit` passes
- [x] ESLint / prettier clean (pre-commit hook)
- [x] No new npm dependency

## Verification

- [x] Two tabs render (Agent Activity + badge, Status Transitions); active tab underlined; clicking switches panes
- [x] DOM: role="tablist" on bar; role="tab" + aria-selected on tabs; aria-controls ↔ role="tabpanel" + aria-labelledby wired; inactive panel has `hidden`
- [x] Active pane in a bordered rounded panel (matches the board frame)
- [x] Engine-off: no tabs, just Timeline — unchanged
- [x] Verified on a fresh repo build (global insight-flow is stale); no ActivityFeed/Timeline regression
