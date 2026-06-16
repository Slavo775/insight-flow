# N130 — Status badges/colors/titles read flow status defs — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`core/kanban` adds `statusLabel` / `statusColor` / `isCanonicalStatus`. `Badge`
takes a `statuses` prop: canonical statuses keep the grouped tones (default
byte-identical), a non-canonical status with a valid hex color renders a colored
badge (translucent fill + hex). Applied via `useFlowStatusMap` across kanban
cards, task detail (Info + status history), and timeline (color + label).

## Checklist verification

- [x] Styling resolves from flow statuses; canonical fallback unchanged — `status-style.test.mjs`.
- [x] Consistent across kanban / detail / timeline.
- [x] Unknown status → raw id + neutral color.
- [x] Default-flow parity asserted (title===id, color==#f59e0b, done→neutral).

## Blockers

None.

## Non-blocking

- `HEX6` only accepts `#rrggbb`; a 3-digit or named color in a custom status def silently falls back to the grouped tone. Acceptable (and safe for `hexToRgb`), but a small note in the status-form would help authors.
- Review-verdict / incident badges intentionally pass no `statuses` (resolve canonically) — correct, just confirming it's deliberate.

## Security & edge cases

- Custom color is regex-validated before `hexToRgb`, so no `NaN` rgb leakage. Source-of-truth colors live in the default flow's statuses; tests pin them to the theme palette for parity.

## Notes

Closes Epic 4. Depends on N128 (+ N129).
