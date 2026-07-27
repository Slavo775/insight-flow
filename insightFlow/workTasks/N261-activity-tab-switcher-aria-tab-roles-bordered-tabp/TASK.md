# N261 — Activity tab switcher — ARIA tab roles, bordered tabpanel, Status Transitions label

**Type:** feat
**Priority:** medium
**Created:** 2026-07-27

## Problem

The dashboard's activity tab switcher (`App.tsx:141-174`) already works and looks close to the Lovable design — two underline tabs over swapped panes — but it has no ARIA tab semantics (the tabs are bare `<button>`s, the bar has no `role="tablist"`, the panes have no `role="tabpanel"`), the panes are not in a bordered panel, and the second tab is labelled "Recent Activity" instead of the design's "Status Transitions". This is a small, additive rework — no pane rebuild.

## Goal

1. Give the tab switcher proper ARIA roles: `tablist` / `tab` (+ `aria-selected`, `id`, `aria-controls`) / `tabpanel` (+ `aria-labelledby`), and toggle the inactive panel with the `hidden` attribute.
2. Put the active pane in a bordered/rounded surface panel (visually consistent with N260's `BoardFrame`).
3. Rename the second tab "Recent Activity" → **"Status Transitions"** (it already shows status transitions).
4. Keep everything else — the underline tab style, the panes, the idle/active badge, and the engine-off gating — unchanged.

## Scope

### In scope

- **`dashboard/client/App.tsx`** (`DashboardView`, the `activityEnabled ?` block ~141-174):
  - `.act-tab-bar` → `role="tablist"` + `aria-label="Activity views"`.
  - Each tab `Button` → `role="tab"`, `aria-selected={actTab === "…"}`, `id` (`tab-agent` / `tab-status`), `aria-controls` (`panel-agent` / `panel-status`). (`Button` is `styled.button` and passes these DOM/aria attributes through — no `Button.tsx` change needed.)
  - Each pane wrapper → `role="tabpanel"`, `id` (`panel-agent` / `panel-status`), `aria-labelledby` (its tab id), and `hidden` when not active (replace the inline `display: none` toggling with the `hidden` attribute; both panes may stay mounted).
  - Rename the second tab text "Recent Activity" → "Status Transitions". Keep the first tab "Agent Activity" + its `<span className={st.cls}>{st.text}</span>` badge.
  - Keep `actTab` state, `setActTab`, and both panes (`ActivityFeed`, `Timeline`) as-is.
- **`dashboard/client/styles.css`** (`.act-tabs`/`.act-tab-bar`/`.act-pane` ~45-48): add a bordered/rounded/surface panel style for the active pane (a `.act-panel` wrapper or restyle `.act-pane`), using the same border/radius/surface tokens as N260's `BoardFrame` (`--border`, `radius.lg`, `--surface`). Keep the tab-bar bottom-border underline.

### Out of scope

- **No new `Tabs`/`TabBar` primitive** — single caller (YAGNI). The separate `docTab` variant in `DetailPanel` is a different bespoke caller and is not being unified now.
- No change to `ActivityFeed` or `Timeline` internals (they already match the design's panes).
- No change to the status badge logic (`activityStatusView`) or `.activity-status` CSS — keep the green-active / muted-idle / yellow permission-needed states (the `permission-needed` state is a real signal the design omits — keep it).
- No change to `Button.tsx` unless a prop passthrough is genuinely missing (it is not — verify only).
- No change to the board (N260), header (N258), project-header card (N259), master, or the store; no new npm dependency.
- Arrow-key roving-tabindex between tabs is **optional** (nice-to-have); not required — Tab/Enter already work on real buttons.

### Engine-off branch

- When `activityEnabled` is `false` (the `else` branch ~170-173), keep the current behavior: **no tabs**, just the `Timeline`. Optionally wrap that standalone `Timeline` in the same bordered panel for visual consistency — but do **not** add tab roles when there is only one view.

## Implementation plan

1. **Add ARIA to the tab bar + tabs** — `role="tablist"` + `aria-label` on `.act-tab-bar`; on each tab `Button` add `role="tab"`, `aria-selected`, `id`, `aria-controls`. Verify the attributes render on the DOM `<button>` (styled-components passes non-transient props through).
2. **Add ARIA to the panes + `hidden`** — wrap each pane as `role="tabpanel"` with `id` + `aria-labelledby`, and set `hidden` on the inactive one instead of `display:none`. (Keep the `agent`/`status` naming consistent with the tab ids.)
3. **Rename** the second tab to "Status Transitions".
4. **Bordered panel CSS** — add the border/radius/surface to the panel wrapper in `styles.css`; match N260's `BoardFrame` tokens. Keep the tab bar's underline bottom-border.
5. **Optional consistency** — give the engine-off standalone `Timeline` the same bordered panel (no tabs).
6. **Verify** (below), then quality gates (typecheck + build + eslint).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` clean; ESLint/prettier clean (pre-commit).
- Manual (fresh repo build — global `insight-flow` is stale; serve on a free port from `playground`, activity engine ON):
  - Two tabs render: **"Agent Activity"** (with the idle/active/permission badge) and **"Status Transitions"**; the active tab has the underline; clicking switches panes.
  - DOM has `role="tablist"` on the bar, `role="tab"` + `aria-selected="true"` on the active tab (`false` on the other), each with `aria-controls` pointing at a `role="tabpanel"` whose `aria-labelledby` points back; the inactive panel has the `hidden` attribute.
  - The active pane sits in a bordered rounded panel (matching the board frame).
  - Engine-off (a project with `activityEnabled:false`, or verify logic): no tabs, just the Timeline — unchanged.
- No regression to `ActivityFeed` / `Timeline` rendering.

## Notes

- Human approved the label rename "Recent Activity" → "Status Transitions".
- Design reference: Lovable `c27ddae3-ad00-4532-9f79-924bf080ee19`, `src/routes/projects.$projectId.tsx` — the "Tabs" section: `role="tablist"` with two underline `TabBtn`s ("Agent Activity" + idle badge, "Status Transitions") over a `role="tabpanel"` rounded bordered panel swapping `AgentActivityPane` (live stream) / `StatusTransitionsPane` (from→to timeline).
- Reuse: `Button $variant="tab"`, `ActivityFeed`, `Timeline`, `activityStatusView` + `.activity-status`, and N260's `BoardFrame` border/radius/surface tokens. Only additive: ARIA attributes, the bordered panel style, the label rename.
- **Context:** N258 + N259 + N260 are approved but **uncommitted**; N261 stacks on them. Commit N258+N259+N260 (and then N261) at git time.
