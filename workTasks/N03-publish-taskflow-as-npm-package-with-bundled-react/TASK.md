# N03 — Publish taskflow as npm package with bundled React UI and local playground

**Type:** feat
**Priority:** high
**Created:** 2026-05-18

## Problem

`packages/taskflow/` is wired as an npm package (CLI + Node HTTP server + WebSocket activity engine), but the server currently ships a minimal hand-rolled HTML dashboard from `src/server/dashboard.ts`. The rich React dashboard in `src/` (Kanban, lifecycle timeline, hotspots, metrics grid, task detail sheet) is a separate Vite/TanStack-Start app that fetches from a hardcoded `http://localhost:3033`. For end users to get the full experience after `npx taskflow`, the React UI must be bundled into the package and served by the same Node server that exposes `/api/work-tasks`. We also need a local playground inside this repo so the package can be installed-and-run against real fixtures before publishing.

## Goal

1. Bundle the React dashboard (`src/`) as a static SPA inside the published package (`packages/taskflow/dist/ui/`).
2. Make `taskflow` / `taskflow ui` serve that SPA, with the SPA fetching `/api/work-tasks/*` from the same origin (no hardcoded port).
3. Make the JSON file location fully driven by `taskflow.config.json` (`workDir`), already wired in `config.ts` — verify and document.
4. Set up publishing metadata (README, LICENSE, repository, prepublishOnly build, files) so `npm publish` from `packages/taskflow/` ships a working CLI + UI.
5. Add a `playground/` workspace in the repo that consumes the local package and serves sample shards, for end-to-end manual testing without publishing.

## Scope

### In scope

- `packages/taskflow/package.json` — publish metadata, scripts, files, exports, bin.
- `packages/taskflow/src/server/index.ts` — replace inline-HTML dashboard with static-file serving + SPA fallback; keep `/api/work-tasks*`, `/api/activity`, `/ws` untouched.
- `packages/taskflow/src/server/dashboard.ts` — delete OR repurpose as a fallback (decide in step 2).
- `packages/taskflow/tsup.config.ts` — ensure CLI builds and `dist/ui/` is preserved (copy-from-build or external).
- New: `packages/taskflow/scripts/build-ui.mjs` (or wire via root `pnpm build:ui` that outputs into the package).
- `vite.config.ts` (root) — add a library-style build mode that emits an SPA into `packages/taskflow/dist/ui/` with relative asset paths and no Cloudflare plugin (use a `mode === "package"` branch or a separate `vite.package.config.ts`).
- `src/lib/api.ts` — replace `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3033"` with a runtime resolver: `window.__TASKFLOW_CONFIG__?.apiBase ?? ""` (same-origin default) so the bundle is portable.
- `src/components/viz/data-loader.tsx` — verify it still works when API base is "" (same origin).
- New: `playground/` directory with `package.json` (depends on `taskflow` via `file:../packages/taskflow` or workspace protocol), `taskflow.config.json`, and seeded `workTasks/` (copy of current sample dataset).
- New: `pnpm-workspace.yaml` at repo root (if missing) listing `packages/*` and `playground`.
- `packages/taskflow/README.md` — install, quickstart, config reference.
- `packages/taskflow/LICENSE` — MIT.
- Root `package.json` — add `build:package`, `play`, `pack:taskflow` scripts.
- `.gitignore` — add `packages/taskflow/dist/`, `playground/node_modules/`.

### Out of scope

- Refactoring the existing CLI commands in `packages/taskflow/src/commands/`.
- Rewriting `task-tracker.mjs` (legacy script stays for the host project).
- Activity engine internals — keep current behavior, just keep it wired through the new server.
- Cloudflare Workers deployment — the published package targets local Node only.
- TanStack Router server routes — the bundled UI is pure client-side SPA.
- Visual redesign of the React dashboard.

## Implementation plan

1. **Decouple the React app from TanStack Start server runtime**
   - Add a `vite.package.config.ts` (or `mode: "package"` branch in existing `vite.config.ts`) using plain `@vitejs/plugin-react` + `vite-tsconfig-paths` + `@tailwindcss/vite` — NOT `@lovable.dev/vite-tanstack-config`, since that pulls in TanStack Start server + Cloudflare plugin.
   - Set `base: "./"` so assets resolve relative to wherever the SPA is mounted.
   - Set `build.outDir: "packages/taskflow/dist/ui"` and `build.emptyOutDir: true`.
   - Create a minimal `src/main.spa.tsx` entry that renders the dashboard route directly (skip TanStack Router file-routing if it requires server bits — render `<Index />` from `src/routes/index.tsx` inside a router-less wrapper, OR keep the router but with `createMemoryHistory`).
   - Add an `index.html` (e.g., `index.package.html`) at repo root that imports `/src/main.spa.tsx`.

2. **Make the API base runtime-configurable**
   - In `src/lib/api.ts`, replace the hardcoded fallback with: `const API_BASE_URL = (window as any).__TASKFLOW_CONFIG__?.apiBase ?? import.meta.env.VITE_API_BASE_URL ?? "";` (empty = same origin).
   - Verify TanStack Query keys still work with relative paths (`fetch("/api/work-tasks")` from the bundled SPA hitting the Node server).

3. **Serve the SPA from the taskflow Node server**
   - In `packages/taskflow/src/server/index.ts`, locate the bundled UI dir at runtime via `import.meta.url` → `resolve(__dirname, "../ui")` (since `dist/cli.js` and `dist/ui/` are siblings).
   - For any GET request not matching `/api/*` or `/ws`, try to serve a file from `dist/ui/`; fall back to `index.html` for SPA routes.
   - Inject runtime config by rewriting `index.html` on each request: replace a `<!-- TASKFLOW_CONFIG -->` placeholder with `<script>window.__TASKFLOW_CONFIG__={projectName,apiBase:"",activityEngine:{enabled:...}}</script>`.
   - Map common MIME types: `.js`, `.css`, `.svg`, `.woff2`, `.png`, `.ico`, `.json`.
   - Remove `getDashboardHtml` usage (delete the file once the new path works, or keep behind a `--legacy-ui` flag).

4. **Build pipeline**
   - Add to `packages/taskflow/package.json`:
     - `"build": "pnpm run build:ui && tsup"`
     - `"build:ui": "cd ../.. && vite build --config vite.package.config.ts"`
     - `"prepublishOnly": "pnpm run build && pnpm run typecheck"`
   - Ensure `tsup.config.ts` keeps `dist/ui/` (do not clean it after `build:ui` runs) — set `clean: false` or order matters: build CLI first, then UI, OR build UI second after `tsup --clean`.
   - Verify `files` in `package.json` includes `dist` (which now covers both `dist/cli.js` and `dist/ui/`).

5. **Publishing metadata**
   - Update `packages/taskflow/package.json`:
     - `repository`, `homepage`, `bugs` fields pointing to the GitHub repo.
     - `author`, `license: "MIT"`.
     - Bump version to `0.2.0` (UI bundling = minor).
     - Add `"publishConfig": { "access": "public" }`.
   - Write `packages/taskflow/README.md`: install (`npm i -g taskflow` or `npx taskflow`), `taskflow init`, `taskflow ui`, full config reference (`workDir`, `shardSize`, `server.port`, `activityEngine.*`).
   - Add `packages/taskflow/LICENSE` (MIT, year 2026, name from package author).

6. **Playground**
   - Create `playground/` with:
     - `package.json` — name `taskflow-playground`, private, deps `{ "taskflow": "workspace:*" }` (or `"file:../packages/taskflow"` if not adopting workspaces).
     - `taskflow.config.json` — `workDir: "workTasks"`, `server.port: 6007`, activity engine enabled.
     - `workTasks/master.json` + `workTasks/tasks-N00-N09.json` — seeded from `src/lib/sample-data.ts` (export the dataset as JSON via a small script, or hand-copy a trimmed version).
     - `README.md` — `pnpm install && pnpm taskflow ui`.
   - Add `pnpm-workspace.yaml` at repo root:
     ```yaml
     packages:
       - "packages/*"
       - "playground"
     ```
   - Root `package.json` scripts:
     - `"build:package": "pnpm --filter taskflow build"`
     - `"play": "pnpm --filter taskflow-playground exec taskflow ui"`
     - `"pack:taskflow": "pnpm --filter taskflow pack"`

7. **Wire .gitignore + verify**
   - Add `packages/taskflow/dist/` and `playground/node_modules/` to root `.gitignore`.
   - Confirm `pnpm install` at repo root links the playground to the local package.

8. **End-to-end verification**
   - `pnpm build:package` → `packages/taskflow/dist/cli.js` + `packages/taskflow/dist/ui/index.html` exist.
   - `pnpm --filter taskflow pack` → produces `taskflow-0.2.0.tgz` containing `dist/cli.js` + `dist/ui/*`.
   - From `playground/`: `pnpm taskflow ui` → browser opens `http://localhost:6007`, shows the React Kanban / timeline / hotspots dashboard, reads from `workTasks/`.
   - Edit a task JSON in `playground/workTasks/` → WebSocket pushes update → UI refreshes.
   - Confirm no `http://localhost:3033` references remain in built assets.

## Verification

- `cd packages/taskflow && pnpm build && pnpm typecheck` — both pass.
- `cd packages/taskflow && npm pack --dry-run` — tarball includes `dist/cli.js`, `dist/ui/index.html`, `dist/ui/assets/*`, `schema/`, `templates/`, `README.md`, `LICENSE`.
- `cd playground && pnpm install && pnpm taskflow ui` — dashboard renders the React UI (not the old inline HTML), Kanban columns populated from sample data.
- Manually edit `playground/workTasks/tasks-N00-N09.json` — UI updates within ~1s via WS file-change broadcast.
- `grep -r "localhost:3033" packages/taskflow/dist` returns no matches.
- `npx --package=./packages/taskflow taskflow help` prints CLI help.

## Notes

- The existing inline `dashboard.ts` is a useful zero-dep fallback. Recommend keeping it behind `--legacy-ui` rather than deleting outright, but not required for this task.
- Tailwind v4 is `@tailwindcss/vite` + CSS-first — the SPA build must include that plugin or the dashboard styles break.
- TanStack Router file-routing relies on `routeTree.gen.ts`; for the SPA build either keep the router with memory history, or render the single `Index` component directly (faster path, since there's only one route today).
- Sample data path: `src/lib/sample-data.ts` exports `SAMPLE_DATASET` — convert this to the master+shard JSON layout for the playground seed.
- After this lands, the host project's `pnpm dev` (TanStack Start on :3335) can continue to coexist for development of the dashboard itself; the package build is a separate target.
- Related: N00 added `useShardIndex` / `useShardData` for paginated shards — those hooks live in `src/lib/api.ts` and must keep working after the API base change.
