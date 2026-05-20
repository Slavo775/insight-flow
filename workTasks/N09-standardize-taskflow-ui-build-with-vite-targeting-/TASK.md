# N09 — Standardize taskflow UI build with Vite targeting dist/ui

**Type:** rework
**Priority:** medium
**Created:** 2026-05-20

## Problem
Per REVIEW_ANALYSIS.md § 5 Phase 3.1, the taskflow UI ships via a custom build script at `scripts/build-taskflow-ui.mjs` invoked by `pnpm --filter insight-flow build:ui`. Custom build scripts drift from ecosystem conventions, are harder to maintain, and miss the ergonomics of a real Vite config (HMR, plugins, env handling, source maps, build analysis). The dashboard at the repo root already uses Vite via `@lovable.dev/vite-tanstack-config` — the package's UI build should follow the same pattern and emit to `packages/taskflow/dist/ui/`.

## Goal
1. `packages/taskflow/` has a proper `vite.config.ts` (or `vite.config.mts`) for the bundled UI.
2. `pnpm --filter insight-flow build:ui` runs `vite build` against that config and emits to `packages/taskflow/dist/ui/`.
3. `scripts/build-taskflow-ui.mjs` is deleted.
4. The published tarball still serves the same UI bundle (no behavioral regression for end users running `insight-flow dashboard` or whatever command serves it).
5. Dev workflow: `pnpm --filter insight-flow dev:ui` (or similar) launches Vite dev server for the bundled UI.

## Scope
### In scope
- `packages/taskflow/vite.config.ts` (new).
- `packages/taskflow/src/server/dashboard.ts` — update asset paths if the output directory or filename pattern changes.
- `packages/taskflow/package.json` — update `build:ui`, add `dev:ui`, ensure `dist/ui` is in `"files"`.
- Delete `scripts/build-taskflow-ui.mjs`.
- Confirm the static-file middleware reads from `dist/ui` (or whatever new path is chosen).

### Out of scope
- Adding new UI features.
- Changing the UI framework or styling.
- Migrating to a different build tool (e.g., Rspack, Turbopack).
- The main dashboard at repo root (`vite.config.ts` for `insight-flow` web app stays as is).

## Implementation plan
1. **Read the current build script**
   - `cat scripts/build-taskflow-ui.mjs` — note: entry points, output dir, plugins, env handling, asset copying.
   - Identify any non-trivial behavior (e.g., inlining assets, copying static files, env injection).
2. **Locate the UI source**
   - Find the UI source folder inside `packages/taskflow/` (likely `src/ui/` or similar). Grep for `createRoot` or `ReactDOM` to confirm.
3. **Author `vite.config.ts`**
   - `root` points to the UI source folder.
   - `build.outDir` = `../dist/ui` (relative to the UI root, resolves to `packages/taskflow/dist/ui/`).
   - `build.emptyOutDir: true`.
   - Plugins: `@vitejs/plugin-react`, anything else the current `.mjs` script does.
   - Set `base: "./"` so the bundle works when served from any path.
4. **Update package scripts**
   - `"build:ui": "vite build"` (with `--config` if needed).
   - `"dev:ui": "vite"` for local development.
5. **Update server static path**
   - In `packages/taskflow/src/server/dashboard.ts`, ensure the static middleware points at `dist/ui` and the `index.html` reference is correct.
6. **Delete the old script**
   - `git rm scripts/build-taskflow-ui.mjs`.
   - Confirm `scripts/` retains only the legitimate scripts (after [[N05]] also removes `task-tracker.mjs`, `scripts/` may end up empty — delete the folder too).
7. **Update `"files"` in package.json**
   - Ensure `"dist"` covers `dist/ui` (or list it explicitly).
8. **Smoke test**
   - `pnpm --filter insight-flow build` — should run CLI build + UI build.
   - `pnpm --filter insight-flow exec insight-flow dashboard` (or whatever the command is) — confirm the UI loads.
   - `pnpm --filter insight-flow pack` — inspect the tarball for `dist/ui/index.html`.
9. **Document**
   - Update `packages/taskflow/README.md` development section with `dev:ui` / `build:ui`.

## Verification
- `pnpm --filter insight-flow build:ui` completes successfully and emits to `packages/taskflow/dist/ui/`.
- `dist/ui/` contains `index.html` and the expected JS/CSS bundles.
- `scripts/build-taskflow-ui.mjs` is removed.
- Launching the bundled dashboard (whichever CLI command does that) loads the UI in a browser without console errors.
- `pnpm --filter insight-flow pack` includes `dist/ui/*` in the tarball.

## Notes
- Source: REVIEW_ANALYSIS.md § 5 Phase 3.1.
- Pairs with [[N06]] (single-source-of-truth sweep) — N06 should not remove `scripts/build-taskflow-ui.mjs` because N09 owns that.
- Don't share a vite.config between the root dashboard and the package UI — they have different roots, different feature sets, and different deploy targets.
- The repo root dashboard uses `@lovable.dev/vite-tanstack-config` per CLAUDE.md. The package UI is separate and should use a vanilla Vite config (lighter, no TanStack Start coupling needed for the embedded dashboard unless that's actually required — check first).
