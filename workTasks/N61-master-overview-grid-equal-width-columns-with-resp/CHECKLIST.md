# N61 — master overview grid: equal-width columns with responsive single-column fallback — Checklist

## Done criteria

- [ ] `.card-grid` CSS uses `repeat(2, minmax(0, 1fr))` — no `grid-2`/`grid-multi` classes remain
- [ ] `@media (max-width: 800px)` rule drops grid to single column
- [ ] `.proj-card` has `min-width: 0`
- [ ] Task title element has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- [ ] `applyGridClass()` function and all its call sites removed from `getScript()`

## Quality gates

- [ ] `pnpm --dir packages/insight-flow-master run build` passes cleanly

## Verification

- [ ] Open overview: right column fully visible, same width as left column, no horizontal scrollbar
- [ ] Long task title is truncated with ellipsis, does not widen the card
- [ ] Viewport < 800px: single column layout
