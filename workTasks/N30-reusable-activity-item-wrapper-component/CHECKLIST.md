# N30 — Reusable activity item wrapper component — Checklist

## Done criteria

- [ ] `.act-item-list` CSS class added: `flex-direction:column; gap:10px`
- [ ] `.act-item` CSS class added: `min-height:60px`, flex row, `padding:0 12px`, `border-left:3px solid transparent`, `border-radius:6px`
- [ ] `taskStatusColor(status)` JS function defined in `getScript()`, covers all 13 task statuses
- [ ] `hexToRgb(hex)` helper added to `getScript()`
- [ ] `actItemHtml(color, innerHtml)` helper added to `getScript()`, returns `.act-item` with inline border-left color and rgba background

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] Dashboard HTML source (view-source in browser) contains `.act-item` and `.act-item-list` class definitions
- [ ] Dashboard HTML source contains `taskStatusColor`, `hexToRgb`, `actItemHtml` function definitions
- [ ] No regressions in existing Claude Activity or Recent Activity rendering before N31/N32
