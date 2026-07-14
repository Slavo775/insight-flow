# N231 — Redesign master overview as React island with shared component kit

**Type:** feat
**Priority:** high
**Created:** 2026-07-14

## Problem

- The master server "Projects overview" landing page (`packages/taskflow/src/master/overview.ts`) is a hand-written HTML string with inline CSS and vanilla JS. Every UI piece (buttons, status pills, project cards, the New-project modal) is a one-off. It cannot reuse the React component library in `dashboard/client/components/`, so the same widgets are built twice and the page is hard to restyle.
- A Lovable prototype ("Insightful Landing Redesign", project `c27ddae3-ad00-4532-9f79-924bf080ee19`) defines a cleaner React version and adds two pieces the page lacks today: a "Currently working on" hero card and a header search.

## Goal

1. Convert the master overview page from server-rendered HTML strings to a **React island** that the master server builds and serves.
2. Add a set of **shared React components** in `dashboard/client/components/` (exported from the barrel) that both the master overview and the project dashboard can use.
3. Match the Lovable redesign for the overview page, including the new "Currently working on" hero card and the header search input.
4. Keep all current master behavior working: backend routes, PWA install (`start_url`), hub notifications, and SSE live updates.
5. Remove the now-dead inline HTML/CSS/JS blocks in `overview.ts` that the React version replaces.

## Scope

### In scope

- **New React island for the master overview**, served by `packages/taskflow/src/master/server.ts` (routes `/` and `/overview`). Replaces `getOverviewHtml` / the inline `CSS` const / `getScript` in `packages/taskflow/src/master/overview.ts`.
- **Shared components** in `packages/taskflow/src/dashboard/client/components/` (all exported from `components/index.ts`):
  - `Button.tsx` — REWORK: add a green `success` variant (today `primary` is blue `theme.color.accent`).
  - `Section.tsx` — REWORK: add an optional `icon?: ReactNode` prop.
  - `StatusPill.tsx` — NEW shared: tones `active` (green) / `permission` (amber) / `idle` (grey) / `done`; extract from `overview.ts` `.claude-status-*` rules.
  - `ProjectCard.tsx` — NEW shared: left status border, name + current-task, notifications bell toggle, Open/Start action. Compose `Card` + `StatusPill` + `Button`. Port logic from `overview.ts` `renderCard()`.
  - `Modal.tsx` — NEW shared shell: backdrop, header + close button, scrollable body, footer, Escape / backdrop-click close, mobile-fullscreen. Extract the duplicated shell from `InstallModal.tsx` + `ModuleInfoModal.tsx`.
  - `SearchInput.tsx` — NEW shared: text input with a leading search icon.
  - `Select.tsx` — NEW shared: styled dropdown.
  - REUSE as-is: `Badge.tsx`, `Card.tsx`, `theme.ts`, `GlobalStyle.tsx`.
- **Master overview page rebuilt in React**:
  - `NewProjectModal` built on the new shared `Modal`; port the folder picker + install checkboxes + editor select from the current `.np-*` markup and `npBrowse` / `npCreate` logic.
  - Online / Offline groups rendered with `Section` (with icon) + a list of `ProjectCard`.
  - NEW: **"Currently working on" hero card** — active project + its current task + a "Jump to task" action.
  - NEW: **header `SearchInput`** that filters the project list by name on the client.

### Out of scope

- Backend/API changes. Routes stay the same: `GET /api/fs/list`, `POST /api/projects/create`, notifications endpoints, and SSE. Do not change `registry.ts` / `types.ts` data shapes unless a field is truly missing for the hero card (flag it first).
- The project dashboard pages themselves — only the shared components they can later adopt are added; do not migrate existing dashboard call sites in this task (optional cleanup only, see Notes).
- Any new npm dependencies without explicit human approval.

## Implementation plan

1. **Wire the React-island build + serve for the master (the main unknown — do this first as a thin slice).**
   - Add a Vite build entry for the master overview app (a small React root, e.g. `src/master/client/main.tsx` + `index.html`) that emits a JS/CSS bundle into the master's served assets.
   - Update `packages/taskflow/src/master/server.ts` (routes at `/` and `/overview`, ~lines 1368-1371) to serve the built HTML shell + bundle instead of `getOverviewHtml`.
   - Update the package build script so the master bundle is produced by `pnpm build` alongside the dashboard client.
   - **Gate:** render a trivial React "hello" island served by master before porting any UI. Confirm PWA `start_url`, `/hub-notify.js`, and SSE still load.
2. **Extend the two existing shared components.**
   - `Button.tsx`: add `success` (green, `theme.color.green`) to the `$variant` union + styles.
   - `Section.tsx`: add optional `icon` prop, rendered before the title.
3. **Build the new shared components** in `dashboard/client/components/`, each exported from `components/index.ts`:
   - `StatusPill.tsx`, `Modal.tsx` (extract from `InstallModal.tsx` + `ModuleInfoModal.tsx`), `SearchInput.tsx`, `Select.tsx`, then `ProjectCard.tsx` (composes `Card` + `StatusPill` + `Button`).
4. **Rebuild the overview UI in React**, using the shared components:
   - Header (logo + `SearchInput` + refresh + green "New project" `Button`).
   - "Currently working on" hero card.
   - `Section` (Online) + `Section` (Offline), each a list of `ProjectCard`.
   - `NewProjectModal` on the shared `Modal` (folder picker, name input, install checkboxes, editor `Select`), calling the same `/api/fs/list` and `POST /api/projects/create`.
5. **Port the client behavior** currently in `getScript()`: refresh, per-project notifications toggle, start-server, folder browsing, create-project, and hook up the new client-side name filter and hero card.
6. **Delete dead code** in `overview.ts` (the inline `CSS` const and `getScript` blocks now replaced), keeping only what the server still needs.
7. **Preserve PWA + realtime:** confirm manifest `start_url`, `/hub-notify.js` injection, and SSE subscription still work through the React island; keep the monospace dark theme by driving all colors from the shared `theme.ts`.

## Verification

- `pnpm build` produces both the dashboard client bundle and the new master overview bundle with no errors.
- `pnpm --dir packages/taskflow exec tsc --noEmit` passes.
- Run `insight-flow master` (or `insight-flow ui`, which auto-starts master on :6100) and open the overview:
  - Header search filters the project list by name.
  - "Currently working on" hero shows the active project + task + "Jump to task".
  - Online / Offline sections render `ProjectCard`s with correct status pill, working bell toggle, and Open / Start actions.
  - "New project" opens the modal; folder picker, install checkboxes, editor select, and Create all work (calls `/api/fs/list` + `POST /api/projects/create`).
  - PWA still installs (manifest `start_url` = overview) and live updates arrive over SSE.
- Compare the result visually against the Lovable prototype (`c27ddae3-ad00-4532-9f79-924bf080ee19`).

## Notes

- **Reference prototype:** Lovable project `c27ddae3-ad00-4532-9f79-924bf080ee19` ("Insightful Landing Redesign"). It hand-rolls everything with inline `oklch()` styles and does not use shadcn — treat it as a visual/behavior reference, not code to copy.
- **Design tokens already match:** `overview.ts` CSS `:root` and the React `theme.ts` use the same palette/radii/fonts, so colors carry over cleanly.
- **Two stacks are separate today:** master (`src/master/`) shares no component code with the dashboard client (`src/dashboard/client/`). This task creates the first shared React usage on the master side via the island.
- **Main risks:** (1) the React-island build/serve wiring for the master is the real unknown — prove it with a thin slice first; (2) keep PWA `start_url` / `/hub-notify.js` / SSE working after the switch; (3) preserve the monospace dark theme via the shared `theme.ts`.
- **Bonus (optional, not required):** the new `Modal`, `SearchInput`, and `Select` also de-duplicate 8+ one-off spots already in the dashboard client (raw `<select>` in `ProjectPage.tsx`, `ModuleForm.tsx`, `FlowEditor.tsx`, `TaskDetailPage.tsx`; duplicated modal shell in `InstallModal.tsx` + `ModuleInfoModal.tsx`). Migrating those is out of scope here but is why these are built as shared.
- Analyzer: `custom:task-fe-analyze`. Approach approved by the human (React build path + both new pieces) on 2026-07-14.
