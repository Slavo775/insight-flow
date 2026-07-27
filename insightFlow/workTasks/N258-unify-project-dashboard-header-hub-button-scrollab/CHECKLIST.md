# N258 — Unify project dashboard header (hub button, scrollable menu, search + settings) — Checklist

## Done criteria

### Promote shared parts into `components/`
- [x] `SquareIconButton` moved from `master/client/ui.tsx` into `dashboard/client/components/` and exported from `components/index.ts`
- [x] Header icons (`SettingsIcon` + any others the header uses) moved from `master/client/icons.tsx` into shared `components/` (still hand-rolled SVG, no new dep)
- [x] `Header` shell moved from `master/client/Header.tsx` into `components/` and exported from the barrel (Left / Actions / `before` slots preserved)
- [x] All `master/client/*` imports rewired to the promoted paths; duplicated definitions removed from `master/client/`

### New shared primitive
- [x] `useScrollEdges(ref)` hook added (one scroll listener + one `ResizeObserver`, exposes `atStart` / `atEnd`, cleans up on unmount)
- [x] `ScrollShadow` wrapper added (`overflow-x:auto`, left/right fade via CSS `mask-image` toggled by data-attributes; left hidden at start, right hidden at end)
- [x] Both exported from `components/index.ts`

### Rebuild the dashboard header (`Nav`)
- [x] LEFT: hub button (links to master overview) + project name
- [x] MIDDLE: the six existing links (Home / Project / Agents / Modules / Overview / Config) with basename handling kept, wrapped in `ScrollShadow`
- [x] RIGHT: `SearchInput` (reused) + settings gear (`SquareIconButton` + `SettingsIcon`); **no bell**
- [x] `styles.css:152-157` updated for the three-group layout + scroll strip

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds (dashboard + master)
- [x] `npx tsc --noEmit` passes
- [x] ESLint / prettier clean (pre-commit hook passes)
- [x] No new npm dependency added (no `lucide-react`)

## Verification

- [x] Dashboard header renders: hub + project name (left), six links (middle), search + settings (right), no bell
- [x] On overflow, the menu scrolls sideways; left fade appears only after scrolling from the start; right fade appears only while more remains; both hidden at their ends
- [x] Master overview + logs page still render correctly after the import rewire
