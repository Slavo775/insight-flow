# N260 — Ticket Board section (TICKET BOARD header + Newer/Older shard pagination + colored Kanban) — Checklist

## Done criteria

### New pieces
- [x] `ArrowRightIcon` added to `components/icons.tsx` (mirror of `ArrowLeftIcon`)
- [x] `statusHeaderColor(col)` added to `lib.ts` (representative status `col.matches[0]` → `taskStatusColor`/`statusColor`; pure; neutral fallback for "Other")

### ShardNav → header row
- [x] `justify-content: space-between`; left title "TICKET BOARD · PAGE {idx+1} OF {shards.length}" (uppercase/muted/tracking)
- [x] Right: Newer `Button $variant="nav"` (`ArrowLeftIcon` + "Newer", disabled `idx<=0`) + `Chip` `{idx+1}/{shards.length}` + Older `Button $variant="nav"` ("Older" + `ArrowRightIcon`, disabled `idx>=shards.length-1`)
- [x] `&laquo;`/`&raquo;` glyphs replaced by arrow icons; `onSelect` wiring + disabled states preserved

### Kanban → bordered board
- [x] Columns row wrapped in `<ScrollShadow>`; `overflow-x` removed from `.kanban` (no nested scrollers)
- [x] Outer bordered `<section aria-label="Ticket board">` around the board
- [x] Column-header label status-colored + count badge tinted via `statusHeaderColor` (Timeline coloring pattern)
- [x] Column order + trailing "Other" orphan column + "No tasks" empty state unchanged

### TaskCard → ticket card
- [x] Status-colored left border (from the shared helper / `taskStatusColor(task.status)`)
- [x] 2-line title clamp (card-local, not on the shared `CardTitle`)
- [x] Card still opens the detail panel on click; `Badge` pill + meta unchanged

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds (dashboard + master)
- [x] `npx tsc --noEmit` passes
- [x] ESLint / prettier clean (pre-commit hook)
- [x] No new npm dependency

## Verification

- [x] Header: "TICKET BOARD · PAGE 1 OF 1" left; `← Newer` / `1/1` chip / `Older →` right; Newer/Older disable at ends and still switch shards (newest first)
- [x] Board is a bordered section; columns scroll sideways with edge fades (no scrollbar); left fade only when scrolled from start, right fade only when more remains
- [x] Column headers status-colored with tinted count badges; order unchanged; "Other" appears for orphans
- [x] Ticket cards have a status-colored left border + 2-line title; clicking opens the detail panel
- [x] Verified on a fresh repo build (global insight-flow is stale); no regression to other `CardTitle` consumers
