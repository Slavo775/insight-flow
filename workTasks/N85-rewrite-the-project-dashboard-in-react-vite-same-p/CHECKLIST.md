# N85 — Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files — Checklist

## Done criteria

- [ ] `/` is served by a React + Vite SPA built into `dist/dashboard/`, from the existing server on the same port (default 6006).
- [ ] `MIME` map serves `.js/.css/.svg/.woff2`; `index.html` at `/`, assets at `/assets/*`.
- [ ] Parity: Kanban, timeline, detail panel, and activity views render and match current behavior.
- [ ] Live updates work via `EventSource('/events')`; notification sounds still play.
- [ ] Dashboard still works when **iframed** by the master overview (6100) — root-relative asset paths.
- [ ] New **read-only** endpoint serves a task's `TASK/CHECKLIST/REVIEW/ANALYSIS.md` (whitelist + traversal guard); detail panel renders it via `react-markdown` + `remark-gfm` + `rehype-sanitize`.
- [ ] No UI writes / drag-drop / lifecycle mutation added (stays agent-driven).
- [ ] `/config`, `/overview`, and the master overview (6100) remain server-rendered and untouched.
- [ ] Stays one package; build script runs `vite build` alongside `tsup`; `dist/dashboard` ships in the tarball.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass (eslint extended for React/JSX)
- [ ] `pnpm --dir packages/taskflow test` passes, including updated `published-surface` + `e2e-smoke` tests
- [ ] No regressions in the dashboard server's `/api/*` / `/events` routes

## Verification

- [ ] `pnpm play` → `:6006` renders Kanban/timeline/detail/activity, updates live on a task change, plays sounds, and renders task markdown prettily.
- [ ] Dashboard renders correctly inside the master overview iframe at `:6100`.
- [ ] `pnpm pack:taskflow` → tarball contains `dist/dashboard/` assets.
