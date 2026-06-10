# N87 — Dashboard task detail — wider panel + dedicated /task/:id page (react-router) + reading mode

**Type:** feat
**Priority:** medium
**Created:** 2026-06-10

## Problem

The task detail is a fixed **480px** right-side slide-over (`.detail-panel` in `src/dashboard/client/styles.css`). Reading a task's generated markdown (TASK/CHECKLIST/REVIEW/ANALYSIS via the Documents tabs) is cramped, there's no URL-addressable detail (no client routing — no shareable link / back button), and the dense dashboard type/spacing is uncomfortable for long-form reading.

## Goal

1. Widen the slide-over panel to ~80vw (quick-peek stays on `/`).
2. Add a dedicated, URL-addressable **`/task/:id`** full page (react-router) with an "open full page" button for the selected task + a back link to `/`.
3. A **reading mode** (larger type + spacing) scoped to the detail panel + full page so the markdown docs are comfortable — the dense Kanban/timeline/activity views are unchanged.
4. Behavior-preserving elsewhere; read-only/agent-driven; no backend change.

## Scope

### In scope

- **Routing:** add `react-router-dom`; wrap the SPA (`main.tsx`/`App`) in `BrowserRouter`. Routes: `/` → dashboard, `/task/:id` → full-page detail. Deep-links resolve via N85's server SPA-fallthrough — **no backend change**. BrowserRouter (clean URLs) over HashRouter.
- **Wider panel:** `.detail-panel` `width: 480px` → `~80vw` (`styles.css`); remains the quick-peek panel on `/`.
- **Full page + button:** an "open full page" button in the detail panel (and/or card) → `navigate('/task/:id')` for the **selected** task. The page reuses the detail content from `DetailPanel.tsx` (Info / Implementation / Reviews / Pushes / Incidents / Status history / Documents md viewer) in a roomy layout + a back link to `/`.
- **Reading mode (detail/page only):** larger `font.size` + `space` for the styled primitives in that subtree (e.g. a nested `<ThemeProvider>` with a bumped theme) + scoped CSS for `.markdown-body`. Kanban/timeline/activity keep current sizes.

### Out of scope

- No **global** type/space change — the dense dashboard aesthetic stays.
- No new dashboard features/data; UI stays **read-only/agent-driven** (no writes/drag-drop).
- No backend changes (`/api/*`, `/api/task-doc`, SSE already exist from N85).
- Master overview (6100) + `/config` + `/overview` — leave as-is. No global redesign.

## Implementation plan

1. **Add react-router + route shell** — install `react-router-dom`; in `main.tsx` wrap `<App>` in `<BrowserRouter>`; in `App` define `<Routes>`: `/` → current dashboard body, `/task/:id` → `<TaskDetailPage>`. Keep `<ThemeProvider>` + `<GlobalStyle>` above the router.
2. **Extract detail content** — factor the inner sections of `DetailPanel.tsx` into a reusable `TaskDetail` body (Info/Implementation/Reviews/Pushes/Incidents/StatusHistory/DocViewer) usable by both the panel and the page.
3. **Widen panel + full-page button** — `.detail-panel` → `~80vw`; add an "open full page" `Button` that `navigate(\`/task/\${task.id}\`)`. `TaskDetailPage` reads `:id` from the route, finds the task in the store (load shard if needed), renders `TaskDetail` + a back link to `/`.
4. **Reading mode** — define a `readingTheme` (base tokens with larger `font.size`/`space`); wrap the panel body + page in `<ThemeProvider theme={readingTheme}>`; add scoped `.markdown-body` size bump (e.g. a wrapper class on the detail/page subtree). Verify Kanban/timeline unaffected.
5. **Store** — `TaskDetailPage` resolves `:id` from `useDashboardStore` (the shard holding it may differ from the current one — load on demand if absent).
6. **Tests/gates** — extend eslint/format coverage (already globs tsx); update `provider-dashboard` bundle anchors only if renamed; keep `e2e-smoke` (`/` shell) green.

## Verification

- `pnpm --dir packages/taskflow run typecheck` (CLI + client) · `lint` · `format:check` green.
- `pnpm --dir packages/taskflow test` green (incl. `e2e-smoke`, `provider-dashboard`).
- Manual (`node packages/taskflow/dist/cli.js ui` → `:6006`): card → ~80vw panel; "open full page" → `/task/:id` renders full detail with md docs at the larger reading size; back link → `/`; deep-link `/task/N86` loads directly; Kanban/timeline density unchanged.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Builds on N85 (dashboard) + N86 (tokens/components/store), both merged.
- `react-router` was explicitly deferred in N86; added here deliberately for a URL-addressable detail page.
- Reading mode reuses the N86 primitives via a larger nested theme; `.markdown-body` is CSS so it needs a scoped size bump too.
- Vitest client tests remain deferred (consistent with N86) unless requested — note if skipped.
