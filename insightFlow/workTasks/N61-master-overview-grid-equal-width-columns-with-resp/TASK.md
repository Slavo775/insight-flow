# N61 — master overview grid: equal-width columns with responsive single-column fallback

**Type:** fix
**Priority:** high
**Created:** 2026-05-27

## Problem

The master overview grid shows two unequal columns: the right column is clipped at the viewport edge. Two compounding causes: (1) grid items default to `min-width: auto`, so long task titles (unbroken strings like "add AGENT_SECURITY.md prompt-injection guardrails") expand each card beyond `1fr`, pushing the right column off-screen; (2) there is no responsive breakpoint — on narrow viewports (e.g. the iframe embed at `localhost:6006/overview`) both columns stay side-by-side even when there is not enough room, instead of stacking to a single column.

## Goal

1. Both columns are always equal width — neither can exceed its `1fr` allocation.
2. Long content inside a card is clamped (ellipsis), never causes the card to widen.
3. At narrow viewport widths (≤ 800px) the grid drops to a single column automatically.
4. Remove the now-redundant `applyGridClass()` JS function and `grid-2`/`grid-multi` CSS classes.

## Scope

### In scope

- `packages/insight-flow-master/src/overview.ts` — CSS section (lines ~60–63) and `getScript()` JS section (`applyGridClass` and its call sites).

### Out of scope

- Card colours, badges, activity section, or any other visual style.
- `packages/taskflow/src/server/index.ts` — the iframe embed is unchanged.

## Implementation plan

1. **Replace grid CSS rules** (`overview.ts` lines ~60–62)
   - Remove `.card-grid { grid-template-columns: 1fr; }`, `.card-grid.grid-2 { ... }`, `.card-grid.grid-multi { ... }`.
   - Replace with:
     ```css
     .card-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
     @media (max-width: 800px) { .card-grid { grid-template-columns: 1fr; } }
     ```
   - `minmax(0, 1fr)` sets the column minimum to `0`, overriding `min-width: auto` so `1fr` is computed against available space, not content width.

2. **Add `min-width: 0` to `.proj-card`** (`overview.ts` CSS line ~63)
   - Append `min-width: 0;` to the existing `.proj-card` rule as a belt-and-suspenders guard.

3. **Clamp the task title text** (`overview.ts` CSS)
   - Identify the CSS class used for task title in `renderCard()` (likely `.proj-task` or similar).
   - Add: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to that rule so long titles truncate rather than widen the card.

4. **Remove `applyGridClass()` and its call sites** (`overview.ts` `getScript()`)
   - Delete the `applyGridClass()` function body.
   - Remove both `applyGridClass()` call sites: inside `renderAll()` and inside `upsertProject()`.

5. **Build**
   - `pnpm --dir packages/insight-flow-master run build` must pass with no errors.

## Verification

- `pnpm --dir packages/insight-flow-master run build` — clean compile.
- Open `localhost:6006/overview` (iframe view) — right column fully visible, same width as left, no horizontal scrollbar.
- A project with a very long task title shows ellipsis, card does not widen.
- Resize browser below 800px — cards stack to single column.

## Notes

- `minmax(0, 1fr)` is the canonical CSS fix for grid items overflowing their `1fr` track. The `0` minimum lets CSS distribute space purely by the `fr` ratio.
- Removing `applyGridClass()` simplifies JS — layout is now CSS-only.
