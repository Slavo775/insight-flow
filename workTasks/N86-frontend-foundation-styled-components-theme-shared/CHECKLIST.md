# N86 — Frontend foundation — styled-components theme + shared component library + Zustand store — Checklist

## Done criteria

- [x] `styled-components` + `zustand` added to `packages/taskflow`; app wrapped in `<ThemeProvider>`.
- [x] Typed theme (`DefaultTheme` augmentation) defines tokens: colors, `space`, `radius`, `font` (family + size + weight) — derived from N85's current values.
- [x] **Single source of truth for color:** `taskStatusColor` (`lib.ts`) + `eventColor`/`hookEventColor` (`activity.ts`) read theme tokens, not hardcoded hex.
- [x] Shared components **implemented AND adopted**: `Button` (nav/tab/icon/close/docTab), `Badge` (status/verdict), `Severity`, `Card`, `Text` (h1/h2/subtitle), `Section`, `Chip` — every raw `<button>` / inline badge / file-chip / heading / detail-section replaced across `App`/`ui`/`DetailPanel`; no primitive left defined-but-unused. (The activity-feed's provider/hook badges stay CSS — they're built as `dangerouslySetInnerHTML` strings, not React. Structural/utility classes — `kv`/`item`/`commit`/`stat`/`column`/`nav`/`mono`/`muted` — intentionally remain as CSS, not "shared components".)
- [x] `styles.css` rules migrated: every primitive's rules removed (no duplicated/orphaned sources). Remaining CSS is layout/structural + the activity-feed string-HTML classes + markdown-body, all consuming the token-driven `:root` vars emitted by `GlobalStyle`.
- [x] Zustand store (`store.ts`) holds global state (agent status, connection status, config snapshot, board data + selectedTaskId); `useDashboardStream` writes SSE frames into it; components read via selectors. View-local state stays local.
- [x] Dashboard is visually ≈identical to N85 (light consistency polish only); no new features; read-only/agent-driven preserved.
- [~] (Recommended) Vitest + RTL — **deferred** (the spec's droppable item; not added this pass). Follow-up if wanted.

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes (CLI + client)
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [x] `pnpm --dir packages/taskflow test` passes (incl. e2e-smoke + provider-dashboard; bundle anchors updated if renamed)
- [~] If added: `test:client` (Vitest) passes — N/A (Vitest deferred)

## Verification

- [x] `node packages/taskflow/dist/cli.js ui` → `/` renders Kanban/timeline/detail/activity ≈identical to N85; markdown viewer works; live SSE updates work.
- [x] `grep` confirms no remaining hardcoded status/activity hex in `lib.ts`/`activity.ts` (sourced from tokens instead).
