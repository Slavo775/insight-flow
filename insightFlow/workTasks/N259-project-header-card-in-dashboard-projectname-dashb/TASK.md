# N259 — Project header card in dashboard (projectName Dashboard + shard/tasks/current + stat tiles)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-23

## Problem

The project dashboard shows the title, the shard/task meta line, and the four stat numbers as three loose pieces in the `.top-bar` + `Stats` area (`App.tsx:71-116`). The title is hardcoded `"Taskflow Dashboard"` (it should show the project name), the four stats are plain grey tiles with no visual grouping, and there is no single "project header" card. The Lovable design groups all of this into one bordered card below the header.

## Goal

1. Add one bordered "project header" card in `DashboardView`, between the `<Nav>` header and the board.
2. Card shows: a green status dot + **`{projectName} Dashboard`** title, and a muted meta line **"Shard: <range> · <N> tasks · current <taskId>"** (reuse the existing `label` string verbatim).
3. Card shows the four stat tiles — **Total Tasks / Completed / Active / Reviews** — as tone-colored tiles.
4. Extract a reusable **`StatTile`** primitive (tone prop) into the shared components barrel, replacing the plain-CSS `.stat` island.
5. Change the **Reviews** number to mean "tasks waiting for review" (see Counts).

## Scope

### In scope

- **`dashboard/client/App.tsx`** (`DashboardView`, ~lines 62-116): turn the `.top-bar` block into the new card; swap the hardcoded title for `{projectName} Dashboard` (`snapshot.projectName` is already selected at `App.tsx:70`); keep the green `.live-dot` next to the title; keep the meta line as the existing `label` (`<Text $variant="subtitle">`); move the `<Stats>` call inside the card.
- **`dashboard/client/components/StatTile.tsx`** (NEW) + export from **`components/index.ts`**: a thin styled-components tile — props `tone` (`"neutral" | "green" | "amber" | "violet"`), `value` (number), `label` (string). Border-tinted by tone + accent-colored number. Tone colors from `theme.ts`: `color.green` (#22c55e), `color.amber` (#f59e0b), `color.purple` (#a855f7, used for `violet`); `neutral` = `color.text`.
- **`dashboard/client/ui.tsx`** (`Stats`, lines 133-156): rework to render 4 `<StatTile>`s with tones — Total=neutral, Completed=green, Active=amber, Reviews=violet. Change the Reviews count (see Counts).
- **`dashboard/client/styles.css`**: remove the now-dead `.stats` / `.stat` / `.stat-value` / `.stat-label` rules (lines 17-20) after migrating to `StatTile`. **Keep** `.live-dot` (11-13) and `.top-bar` only if still used; drop `.top-bar` styles if the block becomes the card.
- Card container: reuse the shared **`Card`** (`components/Card.tsx`). `Card` has a hover accent border (for clickable Kanban cards) + `margin-bottom` — suppress the hover accent for this static header card (add a non-interactive variant/prop, or a small local styled wrapper) so it does not highlight on hover.

### Out of scope

- No change to the `<Nav>` header (that was N258).
- No change to the board (`Kanban`), `ShardNav`, activity feed, or `Timeline`.
- Do **not** add a separate `currentTaskId` field to the store — reuse the existing `label` string. `store.ts` should not need to change.
- No change to `master/client` or the Lovable project.
- No new npm dependency.

## Implementation plan

1. **Build `StatTile`** in `dashboard/client/components/StatTile.tsx`.
   - Styled tile: surface bg, 1px border, radius, padding (match the current `.stat` look, ~min-width 120). A `tone` prop tints the border (subtle) and colors the value number; `label` is muted small-caps, `value` is the big number.
   - Tone → color map from `theme`: `green`→`color.green`, `amber`→`color.amber`, `violet`→`color.purple`, `neutral`→`color.text`. Use a transient `$tone` prop.
   - Export `StatTile` from `components/index.ts`.
2. **Rework `Stats`** (`ui.tsx:133-156`) to render `<StatTile>`s.
   - Keep `total = tasks.length` (neutral), `Completed = merged+done` (green, unchanged), `Active = in-progress+implementing+changes-implementing` (amber, unchanged).
   - **Reviews**: replace `sum of t.reviews[].length` with a count of TASKS whose `status` is review-pending. Define a named constant `REVIEW_PENDING = ["implemented", "reviewing", "fixed"]` and count `tasks.filter(t => REVIEW_PENDING.includes(t.status))`. Tone = violet.
   - Optionally the `Stats` component can take/emit the tone per cell; keep the array-of-cells shape but add `tone`.
3. **Assemble the card** in `App.tsx`.
   - Replace the `.top-bar` outer block with a `Card` (hover suppressed). Inside: row 1 = green `.live-dot` + `<Text as="h1">{projectName ? \`${projectName} Dashboard\` : "Dashboard"}</Text>`; row 2 = `<Text $variant="subtitle">{label}</Text>` (the existing meta line); then the reworked `<Stats tasks={...} />` grid. Keep the existing `loadError` alert + the engine-off chip somewhere sensible (inside or just below the card — keep current behavior).
   - Note: the board currently uses `visibleTasks` (search-filtered) for the Kanban; `Stats` today receives all `tasks`. Keep `Stats` on the full `tasks` set (project totals), matching current behavior — do not switch it to `visibleTasks`.
4. **Clean CSS** — remove `.stats`/`.stat`/`.stat-value`/`.stat-label` (and `.top-bar`/`.top-bar-actions` if the block is replaced) from `styles.css` once nothing references them. Keep `.live-dot`.
5. **Verify** (see Verification), then quality gates (typecheck + build).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` clean; ESLint/prettier clean (pre-commit).
- Manual (fresh repo build — the global `insight-flow` is a stale install; always test the repo build, serve on a free port from `playground`): the dashboard shows one bordered card below the header with: green dot + **`taskflow-playground Dashboard`** title, the **"Shard: … · N tasks · current …"** line, and four tone-colored tiles (Total neutral, Completed green, Active amber, Reviews violet).
- Manual: the card does **not** highlight on hover (static, not clickable).
- Manual: the **Reviews** tile shows the number of tasks in a review-pending status (`implemented`/`reviewing`/`fixed`), not the old review-events tally — confirm against the playground data.
- Manual: no leftover `.stat`/`.stats` styles referenced; `.live-dot` still pulses green when connected.

## Notes

- Human decisions (from N259 fe-analyze): Reviews = "tasks waiting for review"; Completed/Active = keep current logic; scope = extract a shared `StatTile`.
- **"Waiting for review" status set:** `["implemented", "reviewing", "fixed"]` (work done → review pending). Flows are **custom** and `Task.status` is a plain string, so keep this a **named, tolerant set** — the reviewer/human may adjust members (e.g. some flows may also want `changes-implemented`). Do not hard-fail on unknown statuses; just include the known review-pending ones.
- Meta line is produced verbatim as `label` in `store.ts:135-141` ("Shard: <range> · <N> tasks · current <id>") — reuse it; no store change.
- Design reference: Lovable project `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — the "Project header" `<section>` (green dot + `{projectId} · Dashboard`, muted shard line, 4 StatCards: Total / Completed=green / Active=amber / Reviews=violet).
- **Context:** N258 (dashboard header) is approved but **uncommitted** in the working tree; N259 builds on top of it. Handle git for both at the right time (commit N258 before/with N259).
