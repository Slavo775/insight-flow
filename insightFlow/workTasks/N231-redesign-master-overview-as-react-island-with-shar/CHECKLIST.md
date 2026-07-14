# N231 — Redesign master overview as React island with shared component kit — Checklist

## Done criteria

### Step 1 — React island build + serve (thin slice first)
- [x] Add a Vite build entry for the master overview React app (`src/master/client/main.tsx` + `index.html`) emitting a JS/CSS bundle
- [x] `src/master/server.ts` serves the built shell + bundle at `/` and `/overview` instead of `getOverviewHtml`
- [x] `pnpm build` produces the master bundle alongside the dashboard client bundle
- [x] Thin-slice gate: a trivial React island served by master renders; PWA `start_url`, `/hub-notify.js`, and SSE still load

### Step 2 — Extend existing shared components
- [x] `Button.tsx`: add green `success` variant (`theme.color.green`) to the `$variant` union + styles
- [x] `Section.tsx`: add optional `icon?: ReactNode` prop rendered before the title

### Step 3 — New shared components (export each from `components/index.ts`)
- [x] `StatusPill.tsx` — tones active / permission / idle / done (extracted from `overview.ts` `.claude-status-*`)
- [x] `Modal.tsx` — shared shell (backdrop, header + close, scroll body, footer, Esc/backdrop close, mobile-fullscreen), extracted from `InstallModal.tsx` + `ModuleInfoModal.tsx`
- [x] `SearchInput.tsx` — text input with leading search icon
- [x] `Select.tsx` — styled dropdown
- [x] `ProjectCard.tsx` — left status border, name + task, bell toggle, Open/Start; composes `Card` + `StatusPill` + `Button` (ported from `renderCard()`)

### Step 4 — Overview UI rebuilt in React
- [x] Header: logo + `SearchInput` + refresh + green "New project" `Button`
- [x] "Currently working on" hero card (active project + task + "Jump to task")
- [x] Online + Offline `Section`s (with icon) rendering `ProjectCard` lists
- [x] `NewProjectModal` on the shared `Modal`: folder picker + name + install checkboxes + editor `Select`

### Step 5 — Port client behavior
- [x] Refresh, per-project notifications toggle, start-server ported from `getScript()`
- [x] Folder browse + create-project call the same `/api/fs/list` and `POST /api/projects/create`
- [x] Header search filters the project list by name on the client

### Step 6 — Cleanup + preservation
- [x] Remove dead inline `CSS` const + `getScript` blocks in `overview.ts` now replaced by React
- [x] All colors driven from shared `theme.ts` (monospace dark theme preserved)
- [x] PWA `start_url`, `/hub-notify.js`, and SSE confirmed working through the island

## Quality gates

- [x] `pnpm --dir packages/taskflow exec tsc --noEmit` passes
- [x] Lint passes (project pre-commit: prettier + eslint --fix)
- [x] `pnpm build` succeeds (both bundles)
- [x] No regressions in the master overview (routes, PWA, SSE, notifications)

## Verification

- [x] `insight-flow master` (or `insight-flow ui`) opens the redesigned overview on :6100
- [x] Search filters projects; hero shows active project; Online/Offline cards show correct status, bell toggle, Open/Start
- [x] "New project" modal creates a project via `/api/fs/list` + `POST /api/projects/create`
- [x] PWA installs (start_url = overview) and live updates arrive over SSE
- [x] Result matches the Lovable prototype `c27ddae3-ad00-4532-9f79-924bf080ee19`
