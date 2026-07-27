# N260 — Ticket Board section (TICKET BOARD header + Newer/Older shard pagination + colored Kanban)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-23

## Problem

The board area in `DashboardView` (`App.tsx:136-139`) renders `ShardNav` (a plain left-aligned Newer/label/Older row) then `Kanban` (columns with grey headers, no outer frame). It works but does not match the Lovable "Ticket Board" design: there is no "TICKET BOARD · PAGE X OF Y" title, the pagination is not a title-left / controls-right header, the column headers are flat grey (not status-colored), the board has no bordered frame, and the ticket cards have no status-colored left border. This is a **restyle** of pieces that already exist and already carry the right data (shard pagination, column order).

## Goal

1. Rework `ShardNav` into a "Ticket Board" header row: left title **"TICKET BOARD · PAGE X OF Y"**, right = `← Newer` / `n/total` chip / `Older →`.
2. Rework `Kanban` into a bordered board: wrap the columns in `ScrollShadow` (edge fades), add an outer bordered `<section>`, and **status-color** the column-header labels + count badges.
3. Rework `TaskCard` into a ticket card: status-colored **left border** + 2-line title clamp.
4. Add the one new icon (`ArrowRightIcon`) and one shared helper (`statusHeaderColor`).

## Scope

### In scope

- **`dashboard/client/ui.tsx`**
  - `ShardNav` (338-366): `justify-content: space-between`; left `<span>` title `TICKET BOARD · PAGE {idx+1} OF {shards.length}` (uppercase, muted, tracking); right cluster = Newer `Button $variant="nav"` (left arrow, disabled `idx<=0`) + a `Chip` showing `{idx+1}/{shards.length}` + Older `Button $variant="nav"` (right arrow, disabled `idx>=shards.length-1`). Keep the existing `onSelect(shards[idx-1])` / `onSelect(shards[idx+1])` wiring. Swap `&laquo;`/`&raquo;` glyphs for the arrow icons.
  - `Kanban` (205-253): wrap the `.kanban` columns row in `<ScrollShadow>`; add an outer bordered `<section aria-label="Ticket board">`; color the column-header label + count badge via the new `statusHeaderColor(col)` (text `color` + `rgba(hexToRgb(color),0.18)` fill, same pattern as `Timeline` at ui.tsx:292-314). Keep the column order + the trailing "Other" orphan column (219-225).
  - `TaskCard` (176-203): add a status-colored left border (from `taskStatusColor(task.status)` / the shared helper); add a 2-line title clamp on the card title (card-local, not on the shared `CardTitle`). Keep `Card`/`CardId`/`CardTitle`/`CardMeta` + `Badge`.
- **`dashboard/client/components/icons.tsx`**: add `ArrowRightIcon` (mirror of `ArrowLeftIcon` at 138-143: paths `m12 5 7 7-7 7` / `M5 12h14`).
- **`dashboard/client/lib.ts`**: add `statusHeaderColor(col: Column): string` (or a per-status variant) near `taskStatusColor` (106-108) — derive the column's color from a representative status (`col.matches[0]`), using `taskStatusColor` (canonical) / `statusColor` (custom flow) + `hexToRgb`. Shared by the colored column header AND the card left border.
- **`dashboard/client/styles.css`**: `.shard-nav` (23-25) → `justify-content: space-between` + title style; `.kanban` (18) drop `overflow-x: auto` (ScrollShadow owns the scroll now); `.column-header` (20) + `.column-count` (21) allow the injected color; add the bordered board `<section>` styling + the 2-line clamp; keep `.empty` (130) and `.live-dot`/etc.

### Out of scope

- **No change to the pagination logic / data** — shards, `currentShard`, `loadShard`, and newest-first ordering already work (`store.ts` / `api.ts`). Only the presentation of `ShardNav` changes.
- **No change to the column order** — `core/kanban.ts` (`CANONICAL_COLUMNS`) already gives Ready → In Progress → Review → Fix → Approved → Done. Do not touch it.
- No new `Pagination` / `BoardHeader` / `Column` abstraction — single caller (YAGNI); rework in place.
- Do not use `StatusPill` for the card pill (wrong domain) — `Badge` is already correct.
- No change to `<Nav>` (N258), the project-header card (N259), the activity tabs, the detail panel, master, or `store.ts`.
- No new npm dependency.

## Implementation plan

1. **Add `ArrowRightIcon`** to `components/icons.tsx` (mirror `ArrowLeftIcon`). It joins the shared hand-rolled icon set.
2. **Add `statusHeaderColor(col)`** to `lib.ts` next to `taskStatusColor`.
   - Pick a representative status for the column (`col.matches[0]`; the "Other" column can fall back to a neutral/muted color). Return the hex via `taskStatusColor` (canonical) or `statusColor(status, flowStatuses)` for custom-flow columns. Keep it pure.
3. **Rework `ShardNav`** into the header row.
   - Wrap in a styled/`.shard-nav` container with `justify-content: space-between; align-items: center`.
   - Left: the `TICKET BOARD · PAGE {idx+1} OF {shards.length}` title span.
   - Right: Newer `Button` (`<ArrowLeftIcon/>` + "Newer"), `Chip` `{idx+1}/{shards.length}`, Older `Button` ("Older" + `<ArrowRightIcon/>`). Preserve disabled states + onSelect wiring.
4. **Rework `Kanban`** into the bordered board.
   - Outer `<section aria-label="Ticket board">` (bordered, surface bg, rounded) wrapping `<ScrollShadow>` wrapping the `.kanban` row. Remove `overflow-x` from `.kanban`.
   - Per column: color the `column-header` label with `statusHeaderColor(col)` and tint the `.column-count` badge (`rgba(hexToRgb(color),0.18)` fill + `color` text). Keep the label text + count value.
   - Keep the orphan "Other" column and empty "No tasks" state.
5. **Rework `TaskCard`** → ticket card.
   - Add `border-left: 3px solid ${statusHeaderColor-for-this-status}` (card-local styled wrapper or style prop). Add the 2-line clamp to the title. Keep the rest byte-identical (id + Badge, meta row, optional flow chip).
6. **CSS** — apply the `.shard-nav` space-between + title, `.kanban` overflow removal, colored headers, board section, 2-line clamp. Remove nothing still in use.
7. **Verify** (see Verification), then quality gates (typecheck + build).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` clean; ESLint/prettier clean (pre-commit).
- Manual (fresh repo build — global `insight-flow` is a stale install; always test the repo build on a free port from `playground`):
  - The board header shows **"TICKET BOARD · PAGE 1 OF 1"** on the left and `← Newer` / `1/1` chip / `Older →` on the right; Newer/Older disable correctly at the ends and still switch shards (newest first).
  - The board is a bordered section; the columns scroll sideways with **edge fades** (no visible scrollbar), left fade only when scrolled from the start, right fade only when more remains.
  - Each **column header label is status-colored** (Ready blue-ish, In Progress amber, Review purple, Fix red, Approved/Done green, …) with a tinted count badge; column order unchanged; "Other" still appears for orphan statuses.
  - **Ticket cards** have a status-colored **left border** and a 2-line-clamped title; clicking a card still opens the detail panel.
- No regression to other `CardTitle` consumers (the 2-line clamp is card-local).

## Notes

- Human decision (N260 fe-analyze): board horizontal scroll uses **`ScrollShadow` edge-fades** (no visible scrollbar), not a plain scrollbar.
- Pagination "pages" are **shards** (files of ~10 tasks); page X = shard index+1, Y = shard count. Newest shard is the default (`api.ts` sorts descending; `store.ts` picks `index[0]`).
- Column color source: `col.matches[0]` → `taskStatusColor`/`statusColor`. A column matches a *set* of statuses; using the first match is a pragmatic representative — the reviewer/human may refine the mapping if a column's color looks off.
- Design reference: Lovable `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — the "Pagination" flex-between row + the `#board` `<section>` (`<ul flex min-w-max divide-x>` of `w-[220px]` columns; header = status-colored label + count; body = TicketCard list / "No tasks"; card = id + pill + 2-line title + type/priority/date + status-colored left border).
- **Context:** N258 (header) + N259 (project-header card) are approved but **uncommitted**; N260 stacks on them. Commit N258 + N259 (and then N260) at git time.
