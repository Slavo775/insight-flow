# N32 — Claude activity rework with reusable wrapper — Checklist

## Done criteria

- [ ] `eventColor(ev)` helper added to `getScript()` covering all tool types (Event/hook, Skill, Phase, Activity, Tool)
- [ ] `prependActivityItem()` sets `border-left-color` and `background` inline styles using `eventColor()` and `hexToRgb()`
- [ ] `prependActivityItem()` uses class `act-item` instead of `activity-item`
- [ ] All return paths in `renderActivityItemHtml()` wrapped with `actItemHtml(eventColor(ev), ...)`
- [ ] `querySelectorAll('.activity-item')` references updated to `.act-item` throughout `getScript()`
- [ ] `.activity-feed` CSS updated to `display:flex; flex-direction:column; gap:10px`
- [ ] `.activity-item` CSS wrapper rule removed (inner-element classes preserved)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] `pnpm play` → Claude Activity tab — items render with colored left borders and tinted backgrounds, 60 px min-height, 10 px gap
- [ ] Hook events: tool-approved = green border, tool-requested = cyan, turn-failed = red, subagent = purple
- [ ] Skill events: purple border
- [ ] No regressions in badge/icon/label rendering inside items
