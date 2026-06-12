# N09 — Standardize taskflow UI build with Vite targeting dist/ui — Checklist

## Done criteria

- [ ] `packages/taskflow/vite.config.ts` exists and is the single source for the UI build
- [ ] `pnpm --filter insight-flow build:ui` runs `vite build` and emits to `packages/taskflow/dist/ui/`
- [ ] `dist/ui/` contains `index.html` plus bundled JS/CSS
- [ ] `packages/taskflow/src/server/dashboard.ts` serves from the new `dist/ui` path
- [ ] `packages/taskflow/package.json` `"files"` includes `dist` (covering `dist/ui`)
- [ ] `scripts/build-taskflow-ui.mjs` deleted from the repo
- [ ] A `dev:ui` script for HMR-driven UI development
- [ ] Package README documents `build:ui` and `dev:ui`

## Quality gates

- [ ] `pnpm --filter insight-flow typecheck` passes
- [ ] `pnpm --filter insight-flow build` (full: CLI + UI) succeeds
- [ ] `pnpm lint` passes
- [ ] No regressions in the bundled dashboard (loads, no console errors, same features as before)

## Verification

- [ ] `pnpm --filter insight-flow build:ui` exits 0 and produces `packages/taskflow/dist/ui/index.html`
- [ ] Bundle size is comparable to or smaller than the old custom-script output (no accidental dep duplication)
- [ ] Launching the bundled dashboard via the CLI loads the UI with no console errors
- [ ] `pnpm --filter insight-flow pack` produces a tarball that contains `dist/ui/index.html` and assets
- [ ] `scripts/build-taskflow-ui.mjs` no longer exists in the repo
- [ ] `pnpm --filter insight-flow dev:ui` opens the UI in dev mode with HMR working
