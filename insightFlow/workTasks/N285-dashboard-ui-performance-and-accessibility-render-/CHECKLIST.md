# N285 — Dashboard UI performance and accessibility — render isolation, route code-splitting, shared Modal — Checklist

## Done criteria

- [ ] `activityEvents` is read only inside `ActivityFeed`; Kanban and Timeline are memoized; Timeline sort is memoized and NaN-safe; Markdown is memoized on content (A59)
- [ ] `TaskFlowSelector` uses a shared cached `useFlowsList()`; no derived-state effect (A59)
- [ ] `/project`, `/module`, `/agent`, `/task` routes are lazy; `@xyflow/react` is not in the initial chunk; sizes before/after in the PR (A60)
- [ ] The DetailPanel slide-over, `InstallModal`, `ModuleInfoModal` and the FlowEditor edge modal use the shared `<Modal>` (drawer variant where needed) (A61)
- [ ] `SlashCommand` is a keyboard-usable button outside the link; `SettingsMenu` semantics fixed and Escape added (A61)
- [ ] Dead symbols removed: `itemBackground`, `browserNotifications` / `soundsEnabled`, stale comment (A61)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (dashboard and hub render; `provider-dashboard`, `e2e-smoke` green)

## Verification

- [ ] Profiler: an activity event re-renders only the feed
- [ ] Build output: the initial chunk is smaller and contains no `@xyflow/react`
- [ ] Keyboard walkthrough of every migrated dialog passes
