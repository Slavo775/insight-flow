# N14 — Reduce token consumption across insight-flow agents and CLI

**Type:** rework
**Priority:** high
**Created:** 2026-05-22
**Modified:** 2026-05-22

## Problem

Agent slash commands and the `insight-flow` CLI burnt unnecessary tokens on every task lifecycle. Pretty-printed JSON output, duplicated GitHub-API curl blocks, inline TASK/CHECKLIST scaffolds, identical `TOKEN EFFICIENCY` footers across 8 role files, a stale duplicate at `packages/taskflow/templates/roles/`, a dead `compare-URL` branch in `task-git.md`, and full `reviews[]`/`incidents[]` arrays carried inside every shard JSON pushed ~3–4k extra tokens per task through the agent loop and a ~11k-token tax every time a shard was loaded for "which task is next?".

## Goal

1. Compact CLI JSON output across every command except `cmdStats`.
2. Externalize and de-duplicate boilerplate from role files (GitHub-API snippet, TASK/CHECKLIST templates, TOKEN EFFICIENCY footers).
3. Align `task-git.md` with `taskflow.prompt.json` (single `gh pr create` path; remove dead compare-URL branch).
4. End the drift between root role files and `packages/taskflow/templates/roles/` — single source of truth, automated sync on publish.
5. Add `insight-flow show --id Nxx --summary` so agents can fetch lean task state without parsing the full shard.
6. Move per-task `reviews[]` and `incidents[]` out of the shard into per-task side files (`reviews.json`, `incidents.json`); preserve the dashboard's contract via server-side hydration.
7. **(Scope pivot, added after initial implementation)** Consolidate to a single dashboard: delete the React app at `src/`, restore the server-rendered dashboard at `packages/taskflow/src/server/dashboard.ts` as the canonical UI, and rewrite its detail panel to render structured cards instead of `<pre>JSON.stringify(…)</pre>` dumps.

## Scope

### In scope

- `packages/taskflow/src/commands/*.ts` — JSON output compaction across `create`, `status`, `implement`, `review`, `fix`, `push`, `change`, `incident`, `query`, `migrate`, `prompt-build`.
- `packages/taskflow/src/commands/show.ts` (new) + CLI wiring in `cli.ts`.
- `packages/taskflow/src/commands/create.ts` — scaffold `TASK.md`/`CHECKLIST.md` from package templates.
- `packages/taskflow/templates/task/TASK.md.tpl`, `CHECKLIST.md.tpl` (new).
- `packages/taskflow/scripts/sync-role-templates.mjs` (new) + `prepublishOnly` hook in `package.json`.
- `packages/taskflow/src/types.ts`, `schema/index.ts` — lean `Task` shape with optional `reviews`/`incidents` + new summary fields (`reviewCount`, `lastReviewVerdict`, `openIncidentCount`); new `ReviewsFile`, `IncidentsFile` types.
- `packages/taskflow/src/storage.ts` — `loadTaskReviews`, `saveTaskReviews`, `loadTaskIncidents`, `saveTaskIncidents`, `recomputeTaskSummary`, hybrid loaders that fall back to inline arrays for legacy shards.
- `packages/taskflow/src/commands/{review,fix,incident,query}.ts` — mutations rewritten to read/write side files and recompute summaries.
- `packages/taskflow/src/commands/migrate.ts` — new `cmdMigrateReviews` that splits inline arrays from existing shards into side files; idempotent.
- `packages/taskflow/src/server/index.ts` — `hydrateShardJson` helper so `/api/work-tasks/<shard>` returns pre-split shape to the React dashboard.
- Role docs: `TASKMASTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md` — trimmed footers, references to `@GITHUB_PR_API.md`, removed inline scaffolds.
- `AGENT_ENFORCEMENT.md` — adds shared `TOKEN EFFICIENCY` block.
- `GITHUB_PR_API.md` (new) — single home for curl snippets.
- `.claude/commands/task-git.md` — collapsed to `gh pr create`; replaced "Read mrUrl from tracker" guidance with `insight-flow show --summary`.
- `src/components/viz/data-loader.tsx` — `mergeFiles` defaults missing `reviews`/`incidents` to `[]` for upload-mode tolerance.

### In scope (added 2026-05-22 with the dashboard pivot)

- Delete the React app under `src/` (components/viz, lib/task-*, routes, sample-data, store, styles, `index.html`, `index.package.html`).
- Delete root build tooling: `vite.config.ts`, `eslint.config.js`, `components.json`, `.prettierrc`, `.prettierignore`, `tsconfig.json`, `bunfig.toml`, `bun.lockb`, `wrangler.jsonc`, `package-lock.json`.
- Delete `packages/taskflow/vite.config.ts` and `dist/ui/` (no UI bundle anymore).
- Restore + rewrite `packages/taskflow/src/server/dashboard.ts` detail panel with structured renderers: `renderInfo`, `renderImplementation`, `renderReview`, `renderPush`, `renderIncident`, `renderStatusHistory`, plus a `severityChip` helper and KV / item / commit / timeline-mini CSS classes.
- Rewire `packages/taskflow/src/server/index.ts` to serve only the server-rendered dashboard (remove `serveUiFile`, `injectRuntimeConfig`, `serveSpaFallback`, `dist/ui/` path lookup).
- Slim root `package.json` down to workspace orchestration scripts only (no React/Vite/Radix/TanStack/etc. deps).
- Move `@types/node` from root to `packages/taskflow/devDependencies`.
- Reset `packages/taskflow/tsup.config.ts` `clean` to `true` (no `dist/ui/` to protect anymore).
- Add containment guard in `hydrateShardJson` so a maliciously crafted `task.folder` can't escape `workDir`.
- Constrain `IncidentSchema.severity` to `z.enum(["critical","high","medium","low"])` and look up the CSS class via a whitelist map in `renderIncident`.

### Out of scope

- No version bump in this task (CLI still at `0.4.0`); a separate release task covers publish.
- `changesAfterImplementation[]` — stays inline on `Task` for now (separate cleanup if it ever grows).
- `init` flow shipping `GITHUB_PR_API.md`/`AGENT_ENFORCEMENT.md` into consumer projects — existing `prompt-build --apply` path already handles enforcement; follow-up if needed.

## Implementation plan

1. **Compact CLI JSON output**
   - In every `packages/taskflow/src/commands/*.ts`, replace `JSON.stringify(payload, null, 2)` with `JSON.stringify(payload)` except `cmdStats` (`query.ts:91`).
   - Leave on-disk writes in `storage.ts` (`saveMaster`, `saveShard`) and `init/index.ts` pretty-printed for git diffability.

2. **Extract `GITHUB_PR_API.md`**
   - Create at repo root with diff fetch, comment fetch, review POST (APPROVE/REQUEST_CHANGES + inline), reply commands. Use `<PR_NUMBER>` placeholders.
   - Replace inline curl blocks in `TASK_REVIEWER_ROLE.md` and `TASK_REVIEW_FIXER_ROLE.md` with `@GITHUB_PR_API.md`.

3. **Consolidate TOKEN EFFICIENCY footer**
   - Add a `TOKEN EFFICIENCY (applies to every role)` block to `AGENT_ENFORCEMENT.md` covering "no subagents", "batch reads", "read only what scope requires".
   - Trim each role's footer to `TOKEN EFFICIENCY (see @AGENT_ENFORCEMENT.md for shared rules)` plus role-specific scope + tool-round budget.

4. **Externalize TASK.md/CHECKLIST.md templates**
   - Add `packages/taskflow/templates/task/{TASK.md.tpl,CHECKLIST.md.tpl}` with `{{ID}}`/`{{TITLE}}`/`{{TYPE}}`/`{{PRIORITY}}`/`{{DATE}}` placeholders.
   - In `commands/create.ts`, add `renderTemplate` + `scaffoldTaskDocs` that write the two files into the new folder after `mkdirSync`. Include `taskMd`/`checklistMd` in the JSON response.
   - Trim `TASKMASTER_ROLE.md`: drop the inline templates; document the fill-in flow.

5. **Trim task-git dead branch**
   - In `.claude/commands/task-git.md`, replace "use git only, no gh" + the compare-URL fork with a single `gh pr create` HEREDOC.
   - Change "Read the task from the sharded tracker files" → `insight-flow show --id Nxx --summary`.

6. **Dedup role templates**
   - Add `packages/taskflow/scripts/sync-role-templates.mjs` that copies the 8 canonical root role files into `packages/taskflow/templates/roles/`. Idempotent; fails loud on missing source.
   - Add `pnpm sync-roles` script; wire `prepublishOnly` to run sync → build → typecheck.
   - Run once and commit the now-aligned templates.

7. **Add `show --summary` (7a)**
   - New `commands/show.ts` with `cmdShow`. `--summary` returns compact `{ id, title, type, priority, status, folder, branch, mrUrl, lastReviewVerdict, reviewCount, openIncidentCount }`. Full mode returns hydrated task JSON (reviews + incidents merged in from side files).
   - Wire into `cli.ts` switch + help text.

8. **Per-task side files (7b)**
   - `types.ts`: make `Task.reviews`/`Task.incidents` optional, add summary fields, add `ReviewsFile`/`IncidentsFile`.
   - `schema/index.ts`: same, plus `ReviewsFileSchema`/`IncidentsFileSchema`.
   - `storage.ts`: add `loadTaskReviews/Incidents`, `saveTaskReviews/Incidents`, `loadTaskReviewsHybrid/loadTaskIncidentsHybrid` (side file → inline shard fallback), `recomputeTaskSummary` (strips inline arrays).
   - Rewrite `review.ts`, `fix.ts`, `incident.ts` mutations to read/write side files and recompute summaries.
   - Update `query.ts:cmdStats` to load side files; `cmdNextReview` to use `reviewCount`; `cmdNextFix` to load side file for last review comment.
   - `create.ts`: omit `reviews:[]`/`incidents:[]`, initialize summary fields.
   - `migrate.ts`: add `cmdMigrateReviews` + `migrate-reviews` CLI subcommand. **Idempotency requirement:** when re-running after the inline arrays have already been stripped, load the canonical reviews/incidents via `loadTaskReviewsHybrid` / `loadTaskIncidentsHybrid` (NOT `task.reviews ?? []`) before calling `recomputeTaskSummary`, otherwise the summary fields get zeroed on every subsequent run.
   - `server/index.ts`: add `hydrateShardJson`; apply to `/api/work-tasks/tasks-N\d+-N\d+\.json` responses. Include a `normalize` + `startsWith(workDir + sep)` containment guard so a malicious `task.folder` value can't read outside the work directory.
   - Add `test/migrate-reviews.test.mjs` covering: (a) first-run splits inline arrays into side files and strips them from the shard, (b) second run leaves `tasksSplit` AND `shardsTouched` empty and preserves `reviewCount` / `lastReviewVerdict` / `openIncidentCount`.

9. **Dashboard consolidation (scope pivot)**
   - Restore `packages/taskflow/src/server/dashboard.ts` and rewrite the detail-panel `showDetail` function using helper renderers (`renderInfo`, `renderImplementation`, `renderReview`, `renderPush`, `renderIncident`, `renderStatusHistory`, `severityChip`, `section`, `kvRow`, `fileChips`).
   - Add CSS for `.kv`, `.item`, `.commit-list`, `.timeline-mini`, `.severity*`, `.file-chip`, and friends in the existing `CSS` template literal.
   - Rewrite `server/index.ts` SPA-fallback path to always call `getDashboardHtml(config)` and drop all UI-bundle paths.
   - Delete `src/`, `index.html`, `index.package.html`, root Vite/ESLint/Prettier/Bun/Wrangler config files, root `tsconfig.json`, root `package-lock.json`, `packages/taskflow/vite.config.ts`, `packages/taskflow/dist/ui/`.
   - Trim root `package.json` to workspace scripts (`build:package`, `pack:taskflow`, `play`); remove `dev`, `build`, `build:dev`, `preview`, `lint`, `format` scripts and all React/Vite/Radix/TanStack/Tailwind deps.
   - Move `@types/node` into `packages/taskflow/devDependencies`.
   - Reset `packages/taskflow/tsup.config.ts` `clean` back to `true` (no `dist/ui/` co-tenant).
   - Update `packages/taskflow/package.json`: consolidate `build:cli` + `build:ui` into a single `build` script (`tsup`); remove `dev:ui`.
   - Update `CLAUDE.md` to describe the new single-dashboard architecture.

## Verification

- `cd packages/taskflow && pnpm typecheck && pnpm build && pnpm test` — all green (init tests + migrate-reviews tests).
- `node packages/taskflow/dist/cli.js stats` — review numbers match pre-migration (27 review records on N00–N13 before N14 was created).
- `node packages/taskflow/dist/cli.js show --id N00 --summary` — returns `"reviewCount":2,"lastReviewVerdict":"approved"`.
- `node packages/taskflow/dist/cli.js migrate-reviews` — first run splits; **second run reports both `tasksSplit:[]` AND `shardsTouched:[]`** (true idempotency, see Blocker 1 fix).
- `diff -r TASK_*_ROLE.md packages/taskflow/templates/roles/` after `pnpm sync-roles` — empty diff.
- Start server (`node packages/taskflow/dist/cli.js ui`), open `http://localhost:6006`: dashboard renders with the dark dense Kanban; click a task with reviews (e.g. N03) — detail panel shows structured cards (Info / Implementation / Reviews / Pushes / Incidents / Status history), **no `<pre>JSON</pre>` dumps**.
- `curl http://localhost:6006/api/work-tasks/tasks-N00-N09.json` — each task carries `reviews`/`incidents` arrays (hydrated server-side from side files) matching the side-file contents.
- `du -sh packages/taskflow/node_modules/` — under 100 MB (root `node_modules/` is workspace-only and tiny).

## Notes

- Migration ran successfully on this repo: 14 tasks split; shards shrunk from 66 KB → 54 KB. Per-task `reviews.json` files written under each `workTasks/Nxx-*/` folder. After Blocker 1 fix, a second `migrate-reviews` run is a no-op (verified `tasksSplit:[]`, `shardsTouched:[]`).
- Token savings (estimated per task lifecycle): ~3–4k from JSON compaction; ~900 from reviewer/fixer curl extraction; ~500 from footer consolidation; ~300 per `/task-git`; ~600 per `/taskmaster`; ~10k+ avoided per "find next task" hop via `show --summary` + side-file split.
- Dashboard pivot (added 2026-05-22 mid-implementation): user requested consolidating the React dashboard at `:3335` and the legacy server-rendered dashboard at `:6006` into one. The user preferred the legacy dense/dark aesthetic, so the React app was deleted and the legacy dashboard became canonical with an improved detail panel. `node_modules` shrunk from ~1.0 GB to ~53 MB.
- Review found two blockers that were subsequently fixed (round 2 of this task):
  - `cmdMigrateReviews` was not idempotent — re-runs zeroed every task's `reviewCount` because it recomputed summary from the already-stripped `task.reviews`. Fix: use `loadTaskReviewsHybrid` / `loadTaskIncidentsHybrid`. Regression test added.
  - `TASK.md` "Out of scope" originally claimed React/legacy dashboard untouched — false after the pivot. This spec is the corrected version.
- No CLI version bump in this task. When `0.5.0` is cut, mention in CHANGELOG: schema v2 (lean shards + side files), `insight-flow show`, `insight-flow migrate-reviews`, role-template auto-sync, **dashboard consolidation: only the server-rendered UI remains**, React/Vite/Radix/TanStack/etc. deps removed.
- Related: prior work in N01 (CLI extraction), N02 (real-time activity), N08 (role definitions in package), N12 (custom agent rules) set the stage for this de-duplication pass.
- Plan file: `/Users/ssedlak/.claude-personal/plans/optimized-jumping-minsky.md`.
