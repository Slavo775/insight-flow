# N263 — Status Transitions pane → Lovable Lifecycle design (rail + from-to Badges)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-27

## Problem

The "Status Transitions" tab renders the `Timeline` component (`ui.tsx:326-399`) as a flat list of `.act-item` rows — each row is `taskId → statusLabel · by X · time` with a per-row bottom-border tint. It does not match the Lovable "Lifecycle" design (a vertical rail with status-colored dot markers, from→to status pills, a "Current" marker on the newest row, and the actor on a muted second line). After N262 rebuilt the Agent Activity pane into the `.act-stream` timeline, this second tab is the odd one out.

## Goal

1. Restyle `Timeline` into the Lovable "Lifecycle" look: a "LIFECYCLE" header, a vertical rail with status-colored dot markers, and from→to status pills per row.
2. Add a **from→to** transition per row (previous status → new status), derived from each task's ordered `statusHistory`.
3. Mark the newest row as **"Current"**; show the timestamp and the actor ("by X") + taskId.
4. Reuse the N262 `.act-stream*` rail/dot/header CSS and the `Badge` pill — no new component, minimal new CSS.

## Scope

### In scope

- **`dashboard/client/ui.tsx`** — `TimelineEvent` (318-324) + `Timeline` (326-399), reworked in place:
  - **from→to derivation**: extend `TimelineEvent` with `from?: string`. Build events by walking each task's `statusHistory` **by index** so `from = statusHistory[idx-1]?.status` (undefined for the first entry). Keep the cross-task flatten + newest-first sort (line 340) and the 30-row cap (line 351).
  - **Header**: reuse the `.act-stream-head` pattern — left = "LIFECYCLE" (style like `.act-stream-live` but **without** the `.act-live-pulse` dot), right = a **`Chip`** with the transition count (e.g. shown/total).
  - **Rows**: `.act-stream-wrap` > `.act-stream-head` + `<ol className="act-stream">`; each `<li className="act-stream-item">` = a status-colored `.act-stream-dot` (inline `background: rgba(hexToRgb(color),0.25)`, `borderColor: color`; `color = statusColor(to.status, flowStatuses) ?? taskStatusColor(to.status)` — same resolution as line 355) + `.act-stream-row` (`Badge(from)` + inline `→` + `Badge(to)` when `from` exists, else just `Badge(to)`; a **"Current"** inline marker on `events[0]`; `.act-stream-time` = `formatTime(at)` on the right) + a muted second line "by {by||'?'}" with the taskId (reuse `.act-stream-target` for the muted look, or a small muted span).
  - Keep the existing empty state (342-349) as-is.
- **`dashboard/client/styles.css`** — retire the now-unused `.act-item-list` (33) + `.act-item` (34) rules (Timeline is their only consumer). Add only tiny rules if needed (e.g. a "Current" marker); prefer reusing `.act-stream*`.

### Out of scope

- **Behavior stays cross-task** — do NOT switch to single-ticket lifecycle (no selected-ticket wiring). Same data (all tasks' transitions, newest-first, cap 30).
- **Do NOT rename `.act-stream*`** and do NOT touch `ActivityFeed.tsx` / `ActivityItem.tsx` (N262) — reuse the classes as-is.
- Pills use **`Badge`** (task-status, flow-aware) — NOT `components/StatusPill.tsx` (that's the server-state domain; the Lovable "StatusPill" name is a trap).
- No `App.tsx` change (both `Timeline` call sites — the tab at 187 and the fallback at 192 — use the one component).
- No change to the board, header, cards, tabs, master, or the store. No new npm dependency. No new shared React component (single caller — YAGNI).

## Implementation plan

1. **Extend `TimelineEvent`** with `from?: string`; rebuild `events` by index over each task's `statusHistory` capturing `from`. Keep sort + 30-cap.
2. **Header** — `.act-stream-wrap` > `.act-stream-head`: "LIFECYCLE" title + a `Chip` count.
3. **Rows** — `<ol className="act-stream">` of `<li className="act-stream-item">`: colored dot; `Badge(from) → Badge(to)` (or just `Badge(to)`); "Current" on `events[0]`; time on the right; "by X" + taskId muted second line. Color via `statusColor(...) ?? taskStatusColor(...)` with `flowStatuses = statusMap[e.flowId]`.
4. **Pills** — `Badge status={…} statuses={flowStatuses}` for from + to (already how the Kanban pill works).
5. **CSS** — remove `.act-item`/`.act-item-list`; add a small `.lifecycle-current` (or inline) marker if wanted. Keep `.act-stream*` untouched.
6. **Verify** + quality gates (tsc + build + eslint).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` clean; ESLint/prettier clean.
- Manual (fresh repo build — global `insight-flow` is stale; serve on a free port from `playground`, activity engine on):
  - Status Transitions tab shows a "LIFECYCLE" header + count chip, a vertical rail with status-colored dots, and rows of **from→to** status Badges; the newest row has a **"Current"** marker; each row shows the time + "by X" + taskId.
  - Rows with no prior status (a task's first entry) show a single Badge (no arrow), not a broken "undefined →".
  - Agent Activity tab (N262) still renders correctly (shared `.act-stream*` untouched).
  - Empty state still shows when there is no history.
- No leftover `.act-item`/`.act-item-list` references; no console errors.

## Notes

- Human decisions (N263 fe-analyze): **keep cross-task** (restyle only, not single-ticket); **reuse `.act-stream*` as-is** (no rename).
- from→to is derivable because `statusHistory` is an ordered per-task array (`{status, at, by}`); the previous entry is the "from". The cross-task sort happens after, so capture `from` during the per-task walk (before flatten).
- Reuse: `.act-stream*` (rail/dot/head/row/time), `Badge`, `Chip`, `statusColor`/`statusLabel`/`taskStatusColor`/`hexToRgb`/`formatTime`, `useFlowStatusMap` — all already imported in `ui.tsx`.
- Design reference: Lovable `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — `StatusTransitionsPane` (Lifecycle header + rail + ring/dot marker + `from→to` pills + "Current" on newest + time + "by" line). Adapted to **cross-task** (taskId per row) with `Badge` pills.
- **Context:** N258 + N259 + N260 + N261 + N262 all approved but **uncommitted**; N263 stacks on them. Commit the whole stack (N258–N262, then N263) at git time.
