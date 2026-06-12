# N30 — Reusable activity item wrapper component — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** (no PR — implemented on feat/N29-dashboard-activity-tabs)
**Verdict:** approved

## Summary

N30 adds shared CSS classes (`.act-item`, `.act-item-list`) and three JS helpers (`taskStatusColor`, `hexToRgb`, `actItemHtml`) that both activity tabs consume. No logic or routing changed. Build passes. The border style on `.act-item` evolved through human review iterations and a Round 2 fix is still pending (tracked in N32) — this does not block N30 approval since the helpers themselves are correct.

## Checklist verification

- [x] `.act-item-list` CSS added: `display:flex; flex-direction:column; gap:10px` — pass (line 118)
- [x] `.act-item` CSS added: `min-height:60px`, flex row, `padding:0 12px`, `border-radius:6px` — pass (line 119); border style is `border: 1px solid transparent` after Round 1 human fix; Round 2 pending fix will change to `border-bottom`
- [x] `taskStatusColor(status)` defined, covers all 13 task statuses — pass (lines 280–290)
- [x] `hexToRgb(hex)` helper added — pass (lines 292–295)
- [x] `actItemHtml(color, innerHtml)` added, returns `.act-item` with inline border color and rgba background — pass (lines 297–300)

## Non-blocking

- `actItemHtml()` currently sets `border-color:` (all sides) inline while `prependActivityItem()` in N32 still sets `item.style.borderLeftColor` directly — these are inconsistent after the Round 1 human fix. Both will be reconciled when the Round 2 `border-bottom` fix lands.

## Security & edge cases

None — helpers are pure string/DOM operations with no external data.

## Notes

- `taskStatusColor` correctly falls back to `#737373` for unknown statuses.
- `hexToRgb` assumes 6-digit hex with `#` prefix — all callers pass colors from `taskStatusColor` or `hookEventColor` which always produce that format. Safe.
