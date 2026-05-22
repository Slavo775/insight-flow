# N03 — Publish taskflow as npm package with bundled React UI and local playground — Checklist

## Done criteria

### Package SPA build

- [ ] `vite.package.config.ts` (or `mode: "package"` branch) exists, uses plain `@vitejs/plugin-react` + `@tailwindcss/vite` + `vite-tsconfig-paths` (NOT `@lovable.dev/vite-tanstack-config`)
- [ ] `base: "./"` set so assets resolve relative to mount path
- [ ] `build.outDir` points to `packages/taskflow/dist/ui`
- [ ] SPA entry (`src/main.spa.tsx` or equivalent) renders the dashboard without TanStack Start server runtime
- [ ] `index.package.html` (or equivalent) loads the SPA entry

### API client

- [ ] `src/lib/api.ts` resolves `API_BASE_URL` from `window.__TASKFLOW_CONFIG__?.apiBase` first, falling back to env then `""`
- [ ] No hardcoded `http://localhost:3033` remains anywhere in built SPA assets (`grep -r "localhost:3033" packages/taskflow/dist` is empty)

### Server changes

- [ ] `packages/taskflow/src/server/index.ts` serves static files from `dist/ui/` for non-`/api/*`, non-`/ws` GETs
- [ ] SPA fallback: unknown paths return `index.html`
- [ ] `index.html` injection replaces a placeholder with `<script>window.__TASKFLOW_CONFIG__={...}</script>` containing projectName, apiBase, activityEngine.enabled
- [ ] MIME types correctly served for `.js`, `.css`, `.svg`, `.png`, `.ico`, `.woff2`, `.json`
- [ ] `/api/work-tasks`, `/api/work-tasks/:file`, `/api/activity`, `/ws` continue to work
- [ ] WebSocket file-change broadcast still triggers UI refresh in the bundled SPA

### Publishing metadata

- [ ] `packages/taskflow/package.json` version bumped (>= 0.2.0)
- [ ] `repository`, `homepage`, `bugs`, `author`, `license` fields populated
- [ ] `publishConfig.access: "public"` set
- [ ] `prepublishOnly` runs `build` + `typecheck`
- [ ] `build` script chains `build:ui` (vite) + `tsup` (CLI), without one wiping the other's output
- [ ] `files` field includes the built `dist/` (covering CLI + UI), plus `schema/`, `templates/`, `README.md`, `LICENSE`
- [ ] `packages/taskflow/README.md` exists with install, quickstart, full config reference
- [ ] `packages/taskflow/LICENSE` exists (MIT)

### Playground

- [ ] `playground/package.json` exists with `taskflow` dep (workspace: or file:)
- [ ] `playground/taskflow.config.json` exists with custom `workDir` + `server.port`
- [ ] `playground/workTasks/master.json` + at least one shard JSON exist, seeded from sample data
- [ ] `playground/README.md` documents how to run it
- [ ] `pnpm-workspace.yaml` at repo root includes `packages/*` and `playground` (if workspace protocol used)
- [ ] Root `package.json` has `build:package`, `play`, `pack:taskflow` scripts

### Config flexibility

- [ ] `taskflow.config.json` `workDir` controls where JSONs are read from (verified by pointing playground at a non-default dir)
- [ ] `server.port` from config is respected when running `taskflow` / `taskflow ui`

## Quality gates

- [ ] `cd packages/taskflow && pnpm typecheck` passes
- [ ] `cd packages/taskflow && pnpm build` produces `dist/cli.js` + `dist/ui/index.html` + `dist/ui/assets/`
- [ ] Root `pnpm lint` passes (no new lint errors in changed `src/lib/api.ts`)
- [ ] `npm pack --dry-run` from `packages/taskflow/` lists CLI + UI files
- [ ] No regressions to existing CLI commands (`taskflow current`, `taskflow create`, `taskflow stats`)

## Verification

- [ ] `pnpm build:package` (from repo root) succeeds end-to-end
- [ ] `cd playground && pnpm install && pnpm taskflow ui` opens browser to `http://localhost:6007` showing the React dashboard (Kanban + timeline + hotspots), not the legacy inline HTML
- [ ] Sample shards load: at least one task card visible in a Kanban column
- [ ] Editing `playground/workTasks/tasks-N00-N09.json` triggers a UI refresh within ~1s (WebSocket file-change path)
- [ ] Activity hook (if enabled) appends to `.taskflow-activity.jsonl` and events stream to the activity panel
- [ ] `cd packages/taskflow && npm pack` produces `taskflow-X.Y.Z.tgz`; installing that tarball in a scratch dir + running `npx taskflow init && npx taskflow ui` works
- [ ] `grep -r "localhost:3033" packages/taskflow/dist` returns no matches
