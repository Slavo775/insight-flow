# N86 — Frontend foundation — styled-components theme + shared component library + Zustand store

**Type:** rework
**Priority:** medium
**Created:** 2026-06-10
**Modified:** 2026-06-10

## Problem

N85 shipped the React+Vite dashboard but its styling and state grew ad-hoc: design values are scattered (colors live as CSS vars in `styles.css` **and** as duplicated hardcoded hex in `lib.ts` `taskStatusColor` + `activity.ts` `eventColor`/`hookEventColor`; spacing/radius/typography are inline literals everywhere), there are no reusable primitives (buttons/badges are repeated raw markup), and global state (agent/connection status, config) is threaded via props and the `useDashboardStream` hook. No single source of truth for tokens, no component library, no global store.

## Goal

1. A typed **styled-components theme** — one source of truth for colors, spacing, radii, typography; JS color helpers read tokens, not hex.
2. A **shared component library** (Button, Badge, Card, Text, Section, Chip) — **implemented and adopted across the dashboard**, replacing every applicable inline/duplicated/raw-markup usage (no primitive left defined-but-unused; no raw `<button>` / inline `<span class="badge">` / inline-styled equivalent left where a primitive applies).
3. A **Zustand store** for global state (agent status, connection, config snapshot, board data) — components read it without prop-drilling.
4. **Behavior-preserving** (≈identical look; light consistency polish allowed). No new dashboard features.

## Scope

### In scope

- **Deps (approved):** add `styled-components` (+ `@types/styled-components` if shipped types insufficient) and `zustand` to `packages/taskflow`.
- **Theme** — `ThemeProvider` + a typed `DefaultTheme` augmentation; tokens derived from N85's *current* values: colors (the `:root` palette in `src/dashboard/client/styles.css` + the status/activity colors now hardcoded in `lib.ts`/`activity.ts`, unified), `space`, `radius`, `font` (mono family + size + weight scales). `taskStatusColor`/`eventColor`/`hookEventColor` must source from tokens.
- **Components** — `src/dashboard/client/components/`: `Button` (nav/tab/icon/close variants), `Badge` (status/severity/activity/provider), `Card`, `Text` (h1/h2/h3/label/muted/mono), `Section`, `Chip` (file-chip/tag). Migrate `styles.css` rules into styled components + theme; replace inline usages in `App.tsx`, `ui.tsx`, `DetailPanel.tsx`, `ActivityFeed.tsx`.
- **Zustand store** (`src/dashboard/client/store.ts`) — global state: agent status (`claudeStatus`), connection status, SSE config snapshot (projectName, activityEnabled, browserNotifications, soundsEnabled, verbosity, hookStatus), board data (shards, currentShard, tasks, selectedTaskId). Refactor `useDashboardStream` into a thin effect that writes SSE frames into the store. View-local state (settings-popover open, active activity tab) stays local.
- **Tests (recommended, droppable):** add Vitest + React Testing Library; unit-test the store + `Button`/`Badge`. Wire a `test:client` script separate from the `node:test` server suite. Note in the report if skipped.

### Out of scope

- New dashboard features or data; UI writes / drag-drop / custom states / workflows (dashboard stays **read-only + agent-driven**).
- A full visual redesign.
- The master overview server (6100) and the `/config` + `/overview` server-rendered pages — leave as-is. Project dashboard SPA only.
- Any styling paradigm beyond styled-components (no Tailwind / vanilla-extract).

## Implementation plan

1. **Add deps + ThemeProvider** — install `styled-components` + `zustand`; create `theme.ts` (token object) + `theme.d.ts` (`DefaultTheme` augmentation); wrap the app in `<ThemeProvider>` in `main.tsx`.
2. **Tokens from current values** — extract colors (incl. the status/activity palette), spacing (4/6/8/10/12/16/24…), radii (3/4/6/8/10/pill), typography (mono family; size 10–24; weights 500/600/700) verbatim from N85. Repoint `taskStatusColor`/`eventColor`/`hookEventColor` at the tokens.
3. **Build primitives** — `components/` Button, Badge, Card, Text, Section, Chip with variant props mapping to tokens; visual output identical to the current CSS classes.
4. **Migrate views** — replace raw `<button>` / `<span class="badge">` / inline styles in `App.tsx`/`ui.tsx`/`DetailPanel.tsx`/`ActivityFeed.tsx` with the primitives; move `styles.css` rules into components/global style. Keep markup structure so the activity feed's `dangerouslySetInnerHTML` taxonomy still matches.
5. **Zustand store** — `store.ts` with global slices; `useDashboardStream` writes frames into the store; components subscribe via selectors.
6. **Tests (if kept)** — Vitest + RTL: store selectors + `Button`/`Badge` render/variants; `test:client` script.
7. **Re-pin bundle assertions** — if class-name/string anchors used by `test/provider-dashboard.test.mjs` change, update them to the new anchors.

## Verification

- `pnpm --dir packages/taskflow run typecheck` (CLI + client) · `lint` · `format:check` green.
- `pnpm --dir packages/taskflow test` (node:test) green — incl. `e2e-smoke` (`/` serves the React shell) + `provider-dashboard` bundle assertions (updated if anchors moved).
- If tests added: `test:client` (Vitest) green for store + primitives.
- Manual parity (`node packages/taskflow/dist/cli.js ui` → `/`): Kanban / timeline / detail / activity look ≈identical; markdown viewer + live SSE updates still work.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Follow-up to N85 (merged). Owner chose styled-components (over emotion / Tailwind / vanilla-extract and over the leaner extend-CSS-vars option) + one cohesive task, with a refactor+light-polish bar.
- **Risk:** no visual-regression test exists — the styled-components rewrite of N85's CSS must be done carefully to preserve parity; lean on manual parity checks.
- Adds ~15 KB gz (styled-components + zustand) — accepted, consistent with N85's React weight.
- **Change (2026-06-10):** emphasize that the shared components are not just authored but **fully implemented and adopted** in the app — the migration (plan step 4) must leave no raw/inline equivalent where a primitive exists. Adoption was already in scope; this makes it a hard done-criterion.
