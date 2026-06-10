# N87 — Dashboard task detail — wider panel + dedicated /task/:id page (react-router) + reading mode — Checklist

## Done criteria

- [x] `react-router-dom` added; SPA wrapped in `BrowserRouter`; routes `/` (dashboard) and `/task/:id` (full page) work.
- [x] Detail slide-over panel widened to ~80vw (still the quick-peek on `/`).
- [x] "Open full page" button in the panel/card navigates to `/task/:id` for the selected task; the page renders the full detail (Info/Implementation/Reviews/Pushes/Incidents/Status/Documents) + a back link to `/`.
- [x] Deep-linking `/task/:id` directly loads the detail (resolves via the existing server SPA-fallthrough; no backend change).
- [x] **Reading mode**: detail panel + `/task/:id` use larger type + spacing (markdown docs comfortably readable); Kanban/timeline/activity density is **unchanged**.
- [x] No global token change; UI stays read-only/agent-driven; master overview + `/config` untouched.
- [x] Detail content reused by both panel and page (no duplicated detail markup).

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes (CLI + client)
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [x] `pnpm --dir packages/taskflow test` passes (incl. e2e-smoke + provider-dashboard; anchors updated only if renamed)

## Verification

- [x] `node packages/taskflow/dist/cli.js ui` → click a card → ~80vw panel; "open full page" → `/task/:id` full detail with larger md text; back link → `/`; deep-link `/task/N86` loads directly; Kanban/timeline density unchanged.
