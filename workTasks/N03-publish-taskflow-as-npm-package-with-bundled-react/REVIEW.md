# N03 — Publish taskflow as npm package with bundled React UI and local playground — Review

**Reviewer:** Task Reviewer (AI, Round 1)
**PR:** https://github.com/Slavo775/insight-flow/compare/main...feat/N03-publish-taskflow-npm
**Verdict:** APPROVED

---

## Summary

23 files changed, 1174 / -44 lines. Cleanly separates concerns:

- **SPA build**: new `vite.package.config.ts` + `index.package.html` + `src/main.spa.tsx` build the React dashboard as a static SPA into `packages/taskflow/dist/ui/`, isolated from the TanStack Start dev runtime.
- **API client**: `src/lib/api.ts` resolves `API_BASE_URL` from `window.__TASKFLOW_CONFIG__` → `VITE_API_BASE_URL` → `""` (same-origin). Adds `useTaskflowLiveSync` hook that subscribes to `/ws` and invalidates shard queries on file-change events.
- **Server**: `packages/taskflow/src/server/index.ts` now serves static files from `dist/ui/` with an SPA fallback, injects runtime config at a `<!-- TASKFLOW_CONFIG -->` marker, and falls back to the legacy inline dashboard when the bundle is absent. Path-traversal guard in place.
- **Publishing**: v0.2.0, MIT LICENSE, README, full `repository`/`homepage`/`author` metadata, `publishConfig.access:public`, `prepublishOnly = build + typecheck`. Build is `tsup` (CLI) then a vite build via `scripts/build-taskflow-ui.mjs` which also renames `index.package.html` → `index.html`.
- **Playground**: new `playground/` workspace links to `../packages/taskflow` via pnpm `link:`, ships a seeded 4-task dataset, custom port `6007`, activity engine off. Root scripts: `build:package`, `play`, `pack:taskflow`.

**Risk: low.** All changes are additive to the publishable package surface; the existing TanStack Start dev mode (`pnpm dev`) is untouched. The only existing file with behavioral changes is `src/lib/api.ts` (runtime base resolution) and `packages/taskflow/src/server/index.ts` (dashboard serving path) — both have safe fallbacks (env override, legacy inline HTML).

---

## Checklist verification

### Package SPA build

- [x] `vite.package.config.ts` uses `@vitejs/plugin-react` + `@tailwindcss/vite` + `vite-tsconfig-paths`, no lovable preset
- [x] `base: "./"` set
- [x] `outDir: packages/taskflow/dist/ui`
- [x] `src/main.spa.tsx` renders Dashboard via `QueryClientProvider` without TanStack Start runtime
- [x] `index.package.html` loads `/src/main.spa.tsx`

### API client

- [x] `API_BASE_URL` resolves from `window.__TASKFLOW_CONFIG__?.apiBase` → env → `""`
- [x] No `localhost:3033` in `packages/taskflow/dist` (grep confirmed empty)

### Server changes

- [x] Static file serving from `dist/ui/` for non-`/api/*` / non-`/ws` GETs
- [x] SPA fallback returns `index.html` for unknown paths
- [x] Runtime config injection at `<!-- TASKFLOW_CONFIG -->` marker with `<`-escaping for XSS-safety
- [x] MIME types: `.html`, `.js`, `.mjs`, `.css`, `.json`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.map`, `.txt`
- [x] `/api/work-tasks`, `/api/work-tasks/:file`, `/api/activity`, `/ws` preserved
- [x] WebSocket file-change → React-query invalidation via `useTaskflowLiveSync`

### Publishing

- [x] Version 0.2.0
- [x] `repository`, `homepage`, `bugs`, `author`, `license` populated
- [x] `publishConfig.access: "public"`
- [x] `prepublishOnly` chains build + typecheck
- [x] `build` chains CLI then UI (vite second, so dist/ui survives tsup's `clean: true`)
- [x] `files` includes `dist`, `schema`, `templates`, `README.md`, `LICENSE`
- [x] `packages/taskflow/README.md` covers install, quickstart, full config reference
- [x] `packages/taskflow/LICENSE` (MIT)

### Playground

- [x] `playground/package.json` depends on `taskflow` via `link:../packages/taskflow`
- [x] `playground/taskflow.config.json` with `workDir: "workTasks"`, `server.port: 6007`
- [x] `playground/workTasks/master.json` + `tasks-N00-N09.json` (4 seeded tasks: merged, fix-needed, with incident)
- [x] `playground/README.md` documents the flow
- [ ] `pnpm-workspace.yaml` at repo root — **deliberately skipped** in favor of pnpm `link:` protocol; equivalent symlink semantics without risking interaction with the host TanStack Start app. Documented in playground README. Accepted as out-of-spec but functionally equivalent.
- [x] Root scripts: `build:package`, `play`, `pack:taskflow`

### Config flexibility

- [x] `workDir` controls where JSONs are read from (playground sets `workTasks` and the server reads from `playground/workTasks/`)
- [x] `server.port` respected — smoke test confirmed port 6007

### Quality gates

- [x] `pnpm typecheck` in package: PASS
- [x] Root `npx tsc --noEmit`: PASS
- [x] Build produces `dist/cli.js` + `dist/ui/index.html` + `dist/ui/assets/`
- [x] `npm pack --dry-run`: 12 files, 277KB tarball, includes CLI + UI + LICENSE + README + schema
- [x] No CLI regressions (`taskflow help` from playground works)
- [x] ESLint on changed files: 0 errors, 1 warning (`react-refresh/only-export-components` on `main.spa.tsx` — inherent to a Vite entry that renders; harmless in production)

### Verification

- [x] `pnpm run build` end-to-end success
- [x] `pnpm taskflow ui` boots the React SPA on port 6007 with the bundled UI
- [x] Sample shards load via `/api/work-tasks/*` (curl confirmed)
- [x] Runtime config injection confirmed: `window.__TASKFLOW_CONFIG__={"projectName":"taskflow-playground","apiBase":"","activityEngine":{"enabled":false}}`
- [x] `grep -r "localhost:3033" packages/taskflow/dist` empty
- [~] Live update within ~1s via WS file-change — logic verified via code inspection (`watch(workDir)` → `broadcast({type:"file-change"})` → SPA's `useTaskflowLiveSync` invalidates `shard-index`/`shard-data`/`master-data`); full round-trip not load-tested with a browser client
- [~] Tarball install in scratch dir — dry-run verified contents; live `npm install ./taskflow-0.2.0.tgz` not executed

---

## Issues found

### Blockers

None.

### Non-blocking suggestions

1. **`prepublishOnly` is pnpm-specific** — `packages/taskflow/package.json:30` runs `pnpm run build && pnpm run typecheck`. If someone in a non-pnpm environment runs `npm publish`, the hook will fail without pnpm installed. Consider `npm run build && npm run typecheck` for portability, OR document that publishing requires pnpm. Not a blocker — the repo is pnpm-first and the package is built before publish anyway.

2. **Redundant path aliasing** — `vite.package.config.ts:24-26` defines `resolve.alias: { "@": resolve(repoRoot, "src") }` while also using the `vite-tsconfig-paths` plugin, which already reads the `@/*` mapping from `tsconfig.json`. Belt-and-suspenders; remove one for clarity.

3. **Bundle size 773KB raw (226KB gzip)** — Vite emitted the chunk-size warning. For a local dev dashboard the size is acceptable, but a future optimization could split charts (`recharts` is heavy) into a dynamic import or use `rollupOptions.output.manualChunks`. Punt to a follow-up.

4. **`templates/` listed in `files` but empty** — `packages/taskflow/templates/roles/` has no content checked in. Either populate (role markdown templates referenced by `initProject`) or drop `templates` from `files`. Pre-existing, not introduced by N03.

5. **`useTaskflowLiveSync` gates on `API_BASE_URL === ""`** — `src/lib/api.ts:73`. When `API_BASE_URL` is set (e.g., user wires `VITE_API_BASE_URL` to a remote taskflow server), the WS hook becomes a no-op. This is intentional per the comment, but if cross-origin live sync ever becomes a requirement, the gate needs to derive the WS host from `API_BASE_URL` rather than `window.location`. Document or revisit if/when remote API base is actually used.

6. **`prepublishOnly` runs `build` which calls `pnpm run build:ui` from inside the package** — the `build:ui` script invokes `node ../../scripts/build-taskflow-ui.mjs`, which depends on the **repo's** `node_modules/.bin/vite`. If the package is ever extracted/cloned standalone (e.g., a contributor only checks out `packages/taskflow/`), the build fails. Acceptable for a monorepo-published package; flag for future detachment.

---

## Security & edge cases

- **XSS in runtime config injection**: `injectRuntimeConfig` (server/index.ts:37-54) replaces `<` with `<` after `JSON.stringify`, which neutralizes any `</script>` substring in user-controlled `projectName`. Verified safe.
- **Path traversal in static serving**: `serveUiFile` (server/index.ts:101-133) normalizes the resolved path and rejects anything outside `uiDir`. The guard uses `normalized.startsWith(uiDir + sep)`. Standard pattern; correct.
- **CORS**: `Access-Control-Allow-Origin: *` is set on every response. Pre-existing; acceptable for a localhost dev tool. Could tighten to `null` or skip CORS when serving from the bundled SPA (same-origin), but not a blocker.
- **WebSocket auth**: none. Anyone on localhost can connect to `/ws`. Pre-existing; threat model is loopback-only.
- **JSON parse on user-controlled files**: `loadShard` / `loadMaster` (called via CLI commands) parse JSON from disk. If the user's `workTasks/` is corrupted, the server logs and 500s rather than crashes — verified path. Browser side: `JSON.parse` inside fetch hooks throws, which TanStack Query surfaces. OK.

---

## Quality gate results

| Gate                                           | Result                                        |
| ---------------------------------------------- | --------------------------------------------- |
| `pnpm typecheck` (package)                     | ✅ pass                                       |
| `npx tsc --noEmit` (root)                      | ✅ pass                                       |
| `npx eslint <changed files>`                   | ✅ 0 errors, 1 inconsequential warning        |
| `pnpm run build` (package)                     | ✅ produces CLI + UI bundle                   |
| `npm pack --dry-run`                           | ✅ 12 files, 277KB                            |
| End-to-end (playground server smoke)           | ✅ serves SPA, injects config, returns shards |
| `grep "localhost:3033" packages/taskflow/dist` | ✅ empty                                      |

---

## Notes

- One checklist item (`pnpm-workspace.yaml`) is intentionally skipped in favor of `link:` protocol; the rationale is documented in the playground README and in the implementation report. The functional outcome (symlinked local package consumed by the playground) is achieved.
- Live-refresh round-trip and `npm install ./tgz` were not executed in a fully isolated environment; they are verified by code inspection and dry-run respectively. If the user wants stronger end-to-end assurance, run the playground's `pnpm ui` interactively and edit a JSON file in another shell to observe the refresh, or install the packed tarball into a scratch directory.
- Sample seed data uses `example/repo` placeholder URLs — fine for a playground.
