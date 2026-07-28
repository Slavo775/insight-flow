# N265 — Status Transitions pane fidelity — design-accurate pills, ring markers, actor bullet

**Type:** feat
**Priority:** high
**Created:** 2026-07-28

## Problem

N263 built the Status Transitions "Lifecycle" pane with the shared `Badge` (solid grouped-tone fills, sentence-case) and small solid rail dots. The human compared it to the Lovable `StatusTransitionsPane` and it does not match: the design uses **bordered, translucent, status-colored pills with a small dot inside and an UPPERCASE label**, **large ring rail markers** (outline + inner dot, the newest one glowing), and a **hollow-circle bullet** before the actor line.

## Goal

Make the Lifecycle pane (`Timeline` in `ui.tsx`) match the Lovable design, scoped so the Agent Activity pane (shared `.act-stream*`) is untouched:
1. Design-accurate status pills: bordered + translucent status-color fill + a small colored dot inside + UPPERCASE label.
2. Ring rail markers: a colored ring (outline) with an inner dot; the newest ("Current") row's marker glows.
3. A small hollow-circle bullet ○ before the "by X" actor line.

## Scope

### In scope

- **`dashboard/client/ui.tsx`** — the `Timeline` (Lifecycle) rows only:
  - Replace the from/to `<Badge size="md">` pills with a small **local `LifecyclePill`** (status → `statusColor(status, flowStatuses) ?? taskStatusColor(status)` for the color; `statusLabel(status, flowStatuses)` for the text). Render `<span className="lifecycle-pill" style={{ color, borderColor: rgba(color,0.5), background: rgba(color,0.18) }}><span className="lifecycle-pill-dot" style={{ background: color }}/>{label}</span>`; CSS uppercases the label. (Re-add the `statusLabel` import removed in N263.)
  - Replace the row's `.act-stream-dot` with a **ring marker**: `<span className="lifecycle-dot" style={{ '--c': color }} data-current={i === 0 ? "true" : undefined}>`; the ring + inner dot come from CSS (`--c`), and `data-current` adds the glow.
  - Prepend a hollow-circle bullet to the actor line: keep `.act-stream-target` but add a `.lifecycle` scoped `::before` (or an inline `<span className="lifecycle-actor-dot"/>`).
- **`dashboard/client/styles.css`** — add `.lifecycle-pill`, `.lifecycle-pill-dot`, `.lifecycle-dot` (ring + `::after` inner dot), `.lifecycle-dot[data-current="true"]` (glow), and the `.lifecycle .act-stream-target::before` bullet. Keep the existing `.lifecycle .act-stream-*` size bumps (N263).

### Out of scope

- **Do NOT touch the Agent Activity pane** (`ActivityFeed` / `ActivityItem`) or the base `.act-stream*` rules — the ring/pill changes are Lifecycle-scoped (`.lifecycle*` classes or `.lifecycle`-prefixed rules).
- **Do NOT change the shared `Badge`** — the Lifecycle pill is a local component now (Kanban/DetailPanel Badges stay as-is). The N263 `Badge` `size` prop can remain (harmless) or be removed if it ends up with no caller — implementer's call; do not break other Badge users.
- Keep the pane cross-task, newest-first, cap 30, and the "Current" marker on `events[0]` (all from N263). No `App.tsx` / store / master change. No new npm dependency.

## Implementation plan

1. **`LifecyclePill`** local component in `ui.tsx` (color + label + inner dot). Re-add `statusLabel` import.
2. **Swap the from/to Badges** in `Timeline` for `LifecyclePill` (from + to; keep the `→` arrow + single pill when no `from`).
3. **Ring marker** — replace `.act-stream-dot` in the Lifecycle rows with `.lifecycle-dot` (CSS `--c` ring + inner dot; `data-current` glow on `i===0`).
4. **Actor bullet** — add the hollow-circle before the `.act-stream-target` line (scoped to `.lifecycle`).
5. **CSS** — add the `.lifecycle-*` rules; keep Agent Activity untouched.
6. **Verify** + gates.

## Verification

- Fresh repo build (global `insight-flow` is stale; serve on a free port from `playground`). Status Transitions tab:
  - Pills are bordered + translucent + status-colored with a dot inside + UPPERCASE labels (`● IN PROGRESS`, `● FIX`, …) — matching Image #7.
  - Rail markers are colored rings with an inner dot; the newest row's ring glows.
  - A hollow-circle bullet precedes the "taskId · by X" line.
- **Agent Activity tab (N262) is UNCHANGED** — "LIVE STREAM", small solid dots, event pills.
- Kanban / DetailPanel Badges unchanged.
- `tsc --noEmit` + `pnpm build` + `pnpm test` (374) pass; ESLint clean; no console errors.

## Notes

- Human (N265 fe-review of the shipped N263 pane): confirmed all three items; fold into the pending **2.12.0** release (release-please PR #172, N264 at `release-fixed`).
- Design reference: Lovable `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — `StatusTransitionsPane` (`StatusPill` = bordered translucent pill with an inner dot + uppercase; ring marker with inner dot + glow on the current row; ○ before the "by" line).
- **Release impact:** N263 already merged (PR #171); this change lands on `main` and ships in 2.12.0. After it's green, the release re-check (N264) resumes.
