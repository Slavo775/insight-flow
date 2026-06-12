# N25 — UI layout with shared top navigation — Checklist

## Done criteria

- [ ] `getNavHtml(projectName, activePage)` exported from `dashboard.ts` — renders `<nav class="top-nav">` with project name chip + Home + Overview links, active class on current page.
- [ ] `getNavCss()` exported from `dashboard.ts` — returns nav-only CSS rules as a string.
- [ ] Nav CSS rules appended to the `CSS` const in `dashboard.ts` so `getDashboardHtml` picks them up automatically.
- [ ] `getDashboardHtml` renders `getNavHtml(projectName, "home")` at the top of `<body>` before the existing `.top-bar`.
- [ ] `/overview` route in `server/index.ts` imports `getNavHtml` + `getNavCss` and renders the nav above the iframe with `height: calc(100vh - 48px)`.
- [ ] CSS vars (`:root`) are inline in the `/overview` page so the nav colours render correctly.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm typecheck` passes.

## Verification

- [ ] `http://localhost:6006/` — nav at top: project name (left), Home (active, blue) + Overview (right).
- [ ] `http://localhost:6006/overview` — nav at top: project name (left), Home + Overview (active, blue). Iframe fills remaining viewport.
- [ ] Click Home from /overview → navigates to `/`, Home is active.
- [ ] Click Overview from / → navigates to `/overview`, Overview is active.
- [ ] No layout regression on the dashboard (kanban, stats, activity aside unchanged).
