# N258 — Unify project dashboard header (hub button, scrollable menu, search + settings)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-22

## Problem

The project dashboard header (`Nav` in `packages/taskflow/src/dashboard/client/ui.tsx:15`, styled by `.top-nav` / `.nav-links` in `styles.css:152-157`) only shows the project name and the six section links. It has no "hub" back-button in the bar, no search or settings on the right, and its menu row is a plain flex row with no overflow handling — on narrow / mobile widths the links just get cut off. The nicer header parts (a sticky blur `Header` shell, `SquareIconButton`, the hand-rolled SVG icons) already exist but live in `master/client/`, so the dashboard cannot reuse them cleanly today.

## Goal

1. Give the project dashboard a header with: a **hub** button + project name on the left, the section menu in the middle, and search + settings on the right (no bell).
2. Make the middle menu **horizontally scrollable** when it overflows, with an edge fade/shadow on the left (only when scrolled away from the start) and on the right (only when more content remains).
3. Promote the shared header parts (`Header`, `SquareIconButton`, icons) from `master/client/` into the shared `dashboard/client/components/` barrel and rewire master to import them from there (de-dupe, one source).
4. Add one new reusable primitive, `ScrollShadow` (+ `useScrollEdges`), to the shared barrel.

## Scope

### In scope

- **Promote into `packages/taskflow/src/dashboard/client/components/`** (export from `components/index.ts`):
  - `Header` shell (Left / Actions slots + `before` slot) ← from `master/client/Header.tsx`
  - `SquareIconButton` ← from `master/client/ui.tsx`
  - the icon set used by the header (`SettingsIcon`, etc.) ← from `master/client/icons.tsx`
- **Fix master imports**: update `master/client/*` to import the promoted `Header` / `SquareIconButton` / icons from the shared barrel; delete the now-duplicated source in `master/client/`.
- **New shared primitive** `ScrollShadow` + `useScrollEdges` in `components/`, exported from the barrel.
- **Rewrite the dashboard header** `Nav` in `dashboard/client/ui.tsx` on top of the promoted `Header`:
  - LEFT: hub button (link to master overview) + project name
  - MIDDLE: existing six links (Home / Project / Agents / Modules / Overview / Config), keep the router basename handling (see N218/N220 note at `ui.tsx:20`), wrapped in `ScrollShadow`
  - RIGHT: `SearchInput` (reuse `components/SearchInput.tsx`) + settings gear
- Adjust `styles.css:152-157` (`.top-nav` / `.nav-links` / `.nav-link`) for the new layout + scroll container.

### Out of scope

- **No notification bell** in this header (notifications stay on the hub).
- No new npm dependency — icons are hand-rolled SVG; **do not add `lucide-react`**.
- No change to the master overview layout beyond fixing import paths.
- No change to routes, data fetching, or the section pages themselves.
- The floating `⌂ Hub` link the master proxy injects (`master/server.ts:654-664`) stays as-is; this task adds an in-header hub button, it does not remove the proxy link.

## Implementation plan

1. **Promote `SquareIconButton` + icons.**
   - Move `SquareIconButton` from `master/client/ui.tsx` into `dashboard/client/components/` (own file, e.g. `SquareIconButton.tsx`); export from `components/index.ts`.
   - Move the header icons (`SettingsIcon`, plus any others the header needs) from `master/client/icons.tsx` into a shared icons location under `components/`; keep them hand-rolled SVG, `currentColor`, `size` prop.
   - Update `master/client/*` imports to the new paths; remove the moved definitions from `master/client/`.
2. **Promote the `Header` shell.**
   - Move `master/client/Header.tsx` into `components/` (keep the Left / Actions / `before` slots). Export from the barrel.
   - Rewire master (logs page back-button etc.) to import `Header` from the barrel.
3. **Build `ScrollShadow` + `useScrollEdges`** in `components/`.
   - `useScrollEdges(ref)`: attach one `scroll` listener + one `ResizeObserver`; compute `atStart` (scrollLeft ≤ small threshold) and `atEnd` (scrollLeft ≥ scrollWidth − clientWidth − threshold). Clean up on unmount.
   - `ScrollShadow`: a wrapper `div` with `overflow-x: auto` that sets two data-attributes (e.g. `data-at-start` / `data-at-end`) driving a CSS `mask-image` linear-gradient — left fade hidden at start, right fade hidden at end. Prefer the mask over stacked shadow divs.
   - Export both from `components/index.ts`.
4. **Rewrite `Nav`** in `dashboard/client/ui.tsx` on the promoted `Header`:
   - LEFT (via `Header` Left slot): hub button (anchor/`Link` to the master overview root) + project name.
   - MIDDLE: the six existing `Link`s, unchanged targets + basename handling, wrapped in `ScrollShadow`.
   - RIGHT (via `Header` Actions slot): `SearchInput` + a `SquareIconButton` with `SettingsIcon`.
5. **Update `styles.css:152-157`** to match: header layout for three groups, and the `.nav-links` row becomes the scroll strip inside `ScrollShadow` (remove any fixed no-overflow rules that conflict).
6. **Verify** both surfaces build and render (see Verification).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds (dashboard + master both compile after the promotion + import rewire).
- `npx tsc --noEmit` in `packages/taskflow` passes; ESLint clean (pre-commit runs prettier + eslint --fix + typecheck).
- Manual (`pnpm play` → dashboard): the project dashboard header shows hub button + project name (left), the six links (middle), search + settings (right), no bell.
- Manual: narrow the window until the menu overflows — the strip scrolls sideways; the **left** fade appears only after scrolling right from the start; the **right** fade appears only while more content remains; both hidden at their respective ends.
- Manual: the master overview + logs page still render correctly with the promoted `Header` / `SquareIconButton` / icons (import rewire did not break them).

## Notes

- Human decisions locked in analysis (N257 fe-analyze): scope = **Promote & unify**; **skip the bell**.
- Design reference: Lovable project `c27ddae3-ad00-4532-9f79-924bf080ee19`, file `src/routes/projects.$projectId.tsx` (project-view header — hub + `/projectId` left, six-item nav middle, search + bell + settings right; we drop the bell).
- Dependency direction: master already imports from `dashboard/client/components/`, so promoting into that barrel is safe and de-dupes; dashboard importing from `master/client/` would be the wrong direction — do not do that.
- `ScrollShadow` has other future consumers (the Kanban board at `ui.tsx:124`, master header actions row) — that is why it goes in the shared barrel, not inline.
- No scroll-edge / mask-image / ResizeObserver code exists anywhere in the repo today — `ScrollShadow` is the one genuinely new piece.
