# N86 — Frontend foundation — styled-components theme + shared component library + Zustand store — Checklist

## Done criteria

- [ ] `styled-components` + `zustand` added to `packages/taskflow`; app wrapped in `<ThemeProvider>`.
- [ ] Typed theme (`DefaultTheme` augmentation) defines tokens: colors, `space`, `radius`, `font` (family + size + weight) — derived from N85's current values.
- [ ] **Single source of truth for color:** `taskStatusColor` (`lib.ts`) + `eventColor`/`hookEventColor` (`activity.ts`) read theme tokens, not hardcoded hex.
- [ ] Shared components are **implemented AND adopted app-wide**: `Button` (nav/tab/icon/close), `Badge` (status/severity/activity/provider), `Card`, `Text`, `Section`, `Chip` — every applicable raw `<button>` / inline `<span class="badge">` / inline-styled equivalent in `App.tsx`/`ui.tsx`/`DetailPanel.tsx`/`ActivityFeed.tsx` is replaced; no primitive is left defined-but-unused.
- [ ] `styles.css` rules migrated into styled components / theme (no orphaned/duplicated style sources).
- [ ] Zustand store (`store.ts`) holds global state (agent status, connection status, config snapshot, board data + selectedTaskId); `useDashboardStream` writes SSE frames into it; components read via selectors. View-local state stays local.
- [ ] Dashboard is visually ≈identical to N85 (light consistency polish only); no new features; read-only/agent-driven preserved.
- [ ] (Recommended) Vitest + RTL added with `test:client`; store + `Button`/`Badge` unit-tested — or noted as skipped.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes (CLI + client)
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (incl. e2e-smoke + provider-dashboard; bundle anchors updated if renamed)
- [ ] If added: `test:client` (Vitest) passes

## Verification

- [ ] `node packages/taskflow/dist/cli.js ui` → `/` renders Kanban/timeline/detail/activity ≈identical to N85; markdown viewer works; live SSE updates work.
- [ ] `grep` confirms no remaining hardcoded status/activity hex in `lib.ts`/`activity.ts` (sourced from tokens instead).
