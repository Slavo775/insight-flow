# N285 — Dashboard UI performance and accessibility — render isolation, route code-splitting, shared Modal

**Type:** rework
**Priority:** low
**Created:** 2026-10-19

## Problem

**Re-renders.** Every activity event (one per agent tool call) re-renders the whole dashboard view: Kanban, the timeline (which re-sorts every status history) and the open detail panel. The panel re-parses the task's markdown each time. The task page also fetches the flow list twice.

**Bundle size.** The dashboard ships as one 682 KB chunk, so the Kanban home loads the flow editor and markdown libraries it never uses.

**Dialog accessibility.** The task slide-over and three modals lack dialog semantics, Escape handling and focus management, although a correct shared `<Modal>` already exists. A copy-command control is nested inside a link and can't be used from the keyboard.

**Dead code** remains from earlier redesigns.

Source: `N271/AUDIT.md` **A59, A60, A61**.

## Goal

1. An activity event re-renders only the activity feed, not the board, timeline or detail panel.
2. The Kanban home loads without `@xyflow/react` or the markdown stack, which are split into lazy route chunks.
3. Every dialog uses the shared accessible `<Modal>` (or a drawer variant of it).
4. The dead symbols listed in the audit are removed.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/App.tsx` (`activityEvents` subscription :57; route imports :5-12; Kanban / Timeline wiring).
- `ui.tsx` (Timeline :351-378).
- `DetailPanel.tsx` (DocViewer / Markdown :305; slide-over :379-392).
- `TaskDetailPage.tsx` (`TaskFlowSelector` :59-65; `SlashCommand` :165-177).
- `ActivityFeed.tsx`, `components/Modal.tsx` (drawer variant), `components/InstallModal.tsx` (:413), `components/ModuleInfoModal.tsx` (:82), `components/FlowEditor.tsx` (edge modal :692).
- `SettingsMenu.tsx` (:128); `flow-columns.ts` (`useFlowsList`).
- `activity.ts` (:82-88), `store.ts` (:19-20), `useDashboardStream.ts` (:61-62), `GlobalStyle.tsx` (:5).

### Out of scope

- Reliability fixes (SSE, store ordering, error boundaries) → N283. Run this task after it.
- Splitting large files only for size (FlowEditor 830 lines, etc.). Allowed only where needed for the Modal migration.
- Visual redesign.

## Implementation plan

1. **Render isolation (A59).**
   - Move the `activityEvents` subscription from `DashboardView` into `ActivityFeed`.
   - `React.memo` the Kanban and Timeline components.
   - `useMemo` the Timeline's merged + sorted history on `tasks`, and treat a NaN date as 0 in the comparator.
   - `useMemo` the rendered `<Markdown>` element on `content`.
   - Verify with the React DevTools profiler: one activity event re-renders only the feed.
2. **One flow list (A59).** Export a `useFlowsList()` from `flow-columns.ts` (cached, refetched on invalidation) and use it in `TaskFlowSelector`. Replace the derived-state effect (`:65`) with `key={flowId}` on the selector.
3. **Code splitting (A60).** `React.lazy` the `/project`, `/module`, `/agent` and `/task` route elements, with one `<Suspense>` fallback. Record the chunk sizes before and after in the PR. The home chunk must not contain `@xyflow/react`; check with `grep -l xyflow dist/dashboard/assets/*.js`.
4. **Dialogs (A61).**
   - Add a `variant="drawer"` to `components/Modal.tsx`.
   - Render the DetailPanel slide-over, `InstallModal`, `ModuleInfoModal` and the FlowEditor edge modal through it: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape, focus move / trap / restore, scroll lock.
   - Give the close button an `aria-label`.
   - Make `SlashCommand` a `<button type="button">` placed next to the link, not inside it.
   - `SettingsMenu`: drop `role="menu"` (or implement menu semantics) and add Escape.
5. **Dead code (A61).** Remove `itemBackground`, `browserNotifications` / `soundsEnabled` (store fields and writes) and the stale `dangerouslySetInnerHTML` comment.
6. **Checks.** There is no DOM test runner; keep pure helpers unit-testable (the Timeline sort helper). Do a manual keyboard pass: Tab into a card → Enter opens the panel → focus is inside → Escape closes → focus returns to the card.

## Verification

- `pnpm --dir packages/taskflow run typecheck`, `lint` and `test` are green.
- `pnpm --dir packages/taskflow run build` → the initial dashboard JS chunk is much smaller than 682 KB (numbers in the PR), and `@xyflow/react` is only in a lazy chunk.
- React DevTools profiler: during an agent run, Kanban / Timeline / DetailPanel do not re-render per activity event.
- Keyboard-only walkthrough of every migrated dialog passes (focus trapped, Escape closes, focus restored).

## Notes

- Detail and evidence: `N271/AUDIT.md` A59–A61 (bundle measured at 682,073 B; the shared Modal is currently used only by `NewProjectModal`).
- **Depends on N283** (same components). Also touches `DetailPanel.tsx` after N274.
- Recommended run: `/task-analyze N285` → `/task-implement N285`.
