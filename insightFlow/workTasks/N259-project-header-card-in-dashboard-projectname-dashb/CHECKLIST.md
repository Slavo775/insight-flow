# N259 — Project header card in dashboard (projectName Dashboard + shard/tasks/current + stat tiles) — Checklist

## Done criteria

### New shared primitive
- [x] `components/StatTile.tsx` created — props `tone` ("neutral"|"green"|"amber"|"violet"), `value`, `label`; tone colors from `theme` (green/amber/purple/text); transient `$tone` prop
- [x] `StatTile` exported from `components/index.ts`

### Rework `Stats` (ui.tsx)
- [x] `Stats` renders 4 `<StatTile>`s: Total=neutral, Completed=green, Active=amber, Reviews=violet
- [x] Total = `tasks.length`; Completed = `merged+done`; Active = `in-progress+implementing+changes-implementing` (all unchanged)
- [x] Reviews changed to count TASKS with review-pending status: `REVIEW_PENDING = ["implemented","reviewing","fixed"]`, tolerant named set (not the old `sum of t.reviews[]`)

### The card (App.tsx)
- [x] One bordered card (reuse `Card`, hover accent suppressed) placed between `<Nav>` and the board
- [x] Green `.live-dot` + title `{projectName} Dashboard` (from `snapshot.projectName`; hardcoded "Taskflow Dashboard" removed)
- [x] Meta line = existing `label` string verbatim (`<Text $variant="subtitle">`), no store change
- [x] `<Stats>` moved inside the card; still fed the full `tasks` set (not `visibleTasks`)
- [x] `loadError` alert + engine-off chip behavior preserved

### CSS cleanup
- [x] `.stats` / `.stat` / `.stat-value` / `.stat-label` removed from `styles.css` (migrated to `StatTile`); `.top-bar*` removed if the block is replaced; `.live-dot` kept

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` succeeds (dashboard + master)
- [x] `npx tsc --noEmit` passes
- [x] ESLint / prettier clean (pre-commit hook)
- [x] No new npm dependency

## Verification

- [x] Card renders below the header: green dot + "{projectName} Dashboard", the "Shard: … · N tasks · current …" line, 4 tone-colored tiles
- [x] Card does NOT highlight on hover (static)
- [x] Reviews tile counts review-pending tasks (implemented/reviewing/fixed), not review events
- [x] Verified on a fresh repo build (global insight-flow is stale); no leftover `.stat*` styles; `.live-dot` still pulses green
