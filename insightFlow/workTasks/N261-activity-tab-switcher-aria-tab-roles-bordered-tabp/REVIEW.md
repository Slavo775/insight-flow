# N261 — Activity tab switcher — ARIA tab roles, bordered tabpanel, Status Transitions label — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-27
**PR:** (no PR yet)
**Verdict:** ai-approved

## Round 1 — AI pass

### Summary

Small, additive, correct. The activity tab switcher now has proper ARIA tab semantics, the inactive panel uses the `hidden` attribute, the active pane sits in a bordered panel matching N260's board frame, and the second tab is renamed "Status Transitions". Verified in-browser and in-source. `Button.tsx` untouched (styled.button passes the aria/role/hidden props through). No blockers.

### Checklist verification

- [x] `role="tablist"` + `aria-label="Activity views"` on `.act-tab-bar` (App.tsx:143)
- [x] Tabs: `role="tab"`, `id` (tab-agent/tab-status), `aria-selected` bound to `actTab`, `aria-controls` (panel-agent/panel-status) (App.tsx:148-162)
- [x] Panels: `role="tabpanel"`, `id`, `aria-labelledby` back to their tabs, `hidden` on the inactive one (App.tsx:168-185)
- [x] Label "Recent Activity" → "Status Transitions"; "Agent Activity" + badge kept (App.tsx:164)
- [x] Bordered panel `.act-panel` (1px border, 6px radius, surface) matching N260 BoardFrame; tab-bar underline kept; no leftover `.act-pane` (styles.css:51)
- [x] Engine-off branch: standalone Timeline, no tabs, same bordered panel (App.tsx:191)
- [x] build + tsc + eslint pass; verified in-browser (aria-selected + hidden flip on click; badge shows "active")

### Blockers

None.

### Non-blocking

1. **Arrow-key roving-tabindex not implemented (optional, not a WCAG gap).** The tabs are real `<button>`s: reachable by Tab, activated by Enter/Space — that satisfies WCAG 2.1.1 (keyboard operable). Left/Right arrow navigation between tabs is an **ARIA Authoring Practices recommendation**, not a WCAG requirement, and was explicitly scoped optional. Acceptable as-is; add later if a fuller tab pattern is wanted.

### Security & edge cases

None. Pure presentational/ARIA change over already-loaded data.

### Notes

- `hidden` vs the old `display:none`: `hidden` visually hides **and** removes the panel from the accessibility tree / tab order (stronger than `display:none` for AT intent, and semantically correct for an inactive tabpanel). Both panes stay mounted — no state loss on tab switch. Verified: clicking a tab flips `aria-selected` and the `hidden` attribute on both panels.
- `aria-controls` / `aria-labelledby` / `id` all resolve (tab-agent↔panel-agent, tab-status↔panel-status).
- Reuse honored: `Button $variant="tab"`, `ActivityFeed`, `Timeline`, `activityStatusView` + `.activity-status`, N260 frame tokens. Only additive: ARIA attrs, `.act-panel` border, label rename. No new primitive (single caller).
- **Context:** N258 + N259 + N260 + N261 all approved-or-pending but **uncommitted**; N261 stacks on the others. Commit the stack at git time.

## Round 2 — Human pass (approved; pane split to a new task)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-27
**Verdict:** approved

### Human feedback + decision

The human noted the **Agent Activity pane content** (the `ActivityFeed`) does not match the Lovable "LIVE STREAM" timeline design (vertical rail + dot markers + session header + colored pills) — it still shows the old flat tinted-row list. That is correct: N261's declared scope was the tab **chrome** only (ARIA roles, bordered panel, label rename) and explicitly excluded the pane internals; the analysis wrongly accepted "ActivityFeed already matches" without a visual comparison.

Decision (chosen): **approve N261 as the tab-chrome scope**, and handle the Agent Activity pane redesign as a **separate new task** (a fresh `/task-fe-analyze` → plan → implement), since rebuilding `ActivityFeed` into the LIVE STREAM timeline (header + rail + dot markers + pills) touches `ActivityFeed.tsx` / `ActivityItem.tsx` / `activity.ts` / CSS and is a sizable restyle of its own.

N261 → `approved` (tab chrome done). Follow-up: new FE task for the Agent Activity pane visual.