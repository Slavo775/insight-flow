# N85 — Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files — Checklist

## Done criteria

- [x] `/` is served by a React + Vite SPA built into `dist/dashboard/`, from the existing server on the same port (default 6006).
- [x] `MIME` map serves `.js/.css/.svg/.woff2`; `index.html` at `/`, assets at `/assets/*`.
- [x] Parity: Kanban, timeline, detail panel, and activity views render and match current behavior.
- [x] Live updates work via `EventSource('/sse')` (file-change → live board reload, reconnect re-sync); notification sounds still play.
- [x] Dashboard still works when **iframed** by the master overview (6100) — root-relative asset paths.
- [x] New **read-only** endpoint serves a task's `TASK/CHECKLIST/REVIEW/ANALYSIS.md` (whitelist + traversal guard); detail panel renders it via `react-markdown` + `remark-gfm` + `rehype-sanitize`.
- [x] No UI writes / drag-drop / lifecycle mutation added (stays agent-driven).
- [x] `/config`, `/overview`, and the master overview (6100) remain server-rendered and untouched.
- [x] Stays one package; build script runs `vite build` alongside `tsup`; `dist/dashboard` ships in the tarball.

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow lint` + `format:check` pass (eslint extended for React/JSX)
- [x] `pnpm --dir packages/taskflow test` passes, including updated `published-surface` + `e2e-smoke` tests
- [x] No regressions in the dashboard server's `/api/*` / `/events` routes

## Verification

- [x] `pnpm play` → `:6006` renders Kanban/timeline/detail/activity, updates live on a task change, plays sounds, and renders task markdown prettily.
- [x] Dashboard renders correctly inside the master overview iframe at `:6100`.
- [x] `pnpm pack:taskflow` → tarball contains `dist/dashboard/` assets.
