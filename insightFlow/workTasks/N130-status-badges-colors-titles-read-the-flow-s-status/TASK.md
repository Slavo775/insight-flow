# N130 — Status badges/colors/titles read the flow's status defs

**Type:** rework
**Priority:** low
**Created:** 2026-06-15

## Problem

- Status badges, colors, and labels are canonical-only. With flow status sets (N128) carrying `title`/`color` (and N112 state styling), the display should resolve a status's styling from the relevant flow's `statuses`, falling back to canonical.

## Goal

1. Status badges/colors/labels resolve from the relevant flow's `Project.statuses` (`title`/`color`), reusing N112's color/title handling.
2. Canonical statuses fall back to today's styling (unchanged for default-only).
3. Consistent across kanban, task detail, and timeline.
4. An unknown status degrades to a neutral default.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — status badge/label helpers read the flow's `statuses`; reuse N112 color/title.
- Apply across Kanban cards, task detail, timeline.
- Tests: a custom status renders its title/color; a canonical status unchanged; unknown → neutral.

### Out of scope

- Column derivation (N129). The status data model (N128). Engine/pickers (N131+).
- New styling primitives.

## Implementation plan

1. **Resolver** — `statusStyle(status, flow)` → title/color from the flow's set, else canonical, else neutral.
2. **Apply** — kanban/detail/timeline use it.
3. **Tests** — custom/canonical/unknown.

## Verification

- `pnpm build` + suite green; a custom status shows its title/color; default-only unchanged.
- Consistent across surfaces.

## Notes

- Depends on N128 (+ N129). Reuses N112. See N119/ANALYSIS.md.
