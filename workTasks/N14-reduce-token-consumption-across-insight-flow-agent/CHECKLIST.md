# N14 — Reduce token consumption across insight-flow agents and CLI — Checklist

## Done criteria

- [x] All `JSON.stringify(payload, null, 2)` in `packages/taskflow/src/commands/*.ts` switched to compact form except `cmdStats`.
- [x] `GITHUB_PR_API.md` exists at repo root; reviewer + review-fixer roles reference it via `@`.
- [x] `AGENT_ENFORCEMENT.md` carries the shared `TOKEN EFFICIENCY` block; each role file's footer trimmed to a single role-specific budget line.
- [x] `packages/taskflow/templates/task/TASK.md.tpl` and `CHECKLIST.md.tpl` exist; `insight-flow create` writes them into the new task folder and reports the paths in its JSON response.
- [x] `TASKMASTER_ROLE.md` no longer carries the inline TASK.md / CHECKLIST.md scaffolds.
- [x] `.claude/commands/task-git.md` uses `gh pr create` only; the compare-URL fork is removed.
- [x] `packages/taskflow/scripts/sync-role-templates.mjs` exists; `pnpm sync-roles` works; `prepublishOnly` runs sync → build → typecheck.
- [x] `packages/taskflow/templates/roles/*.md` are byte-identical to the root role files after `pnpm sync-roles`.
- [x] `insight-flow show --id Nxx [--summary]` returns lean compact JSON (summary) or hydrated task JSON (full).
- [x] `Task` type drops required `reviews`/`incidents` arrays in favour of optional + summary fields (`reviewCount`, `lastReviewVerdict`, `openIncidentCount`).
- [x] `reviews.json` / `incidents.json` side files are written to `workTasks/Nxx-*/` by all relevant mutations (`review-start/end`, `fix-start/end`, `incident-create/status/resolve`).
- [x] `insight-flow migrate-reviews` splits existing inline arrays into side files; **truly idempotent** (second run reports `tasksSplit:[]` AND `shardsTouched:[]`; summary fields preserved).
- [x] `/api/work-tasks/<shard>` HTTP endpoint hydrates side files into `task.reviews` / `task.incidents`; refuses to read outside `workDir` if a maliciously crafted `task.folder` smuggles `..` segments.
- [x] `packages/taskflow/test/migrate-reviews.test.mjs` covers first-run split + re-run idempotency.
- [x] `IncidentSchema.severity` constrained to `z.enum(["critical","high","medium","low"])`; dashboard's `severityChip` maps to whitelist CSS classes.

## Done criteria — dashboard consolidation pivot (added 2026-05-22)

- [x] React app at `src/` deleted (components/viz, lib/task-*, routes, sample-data, store, styles, root `index.html`, `index.package.html`).
- [x] Root build tooling removed: `vite.config.ts`, `eslint.config.js`, `components.json`, `.prettierrc`, `.prettierignore`, `tsconfig.json`, `bunfig.toml`, `bun.lockb`, `wrangler.jsonc`, `package-lock.json`.
- [x] `packages/taskflow/vite.config.ts` and `dist/ui/` removed.
- [x] `packages/taskflow/src/server/dashboard.ts` restored and detail panel rewritten with structured renderers (`renderInfo`, `renderImplementation`, `renderReview`, `renderPush`, `renderIncident`, `renderStatusHistory`, `severityChip`, `kvRow`, `fileChips`, `section`) — **no `<pre>JSON</pre>` dumps anywhere in the panel**.
- [x] `packages/taskflow/src/server/index.ts` rewired to serve only the server-rendered dashboard; SPA-fallback / `dist/ui/` / `injectRuntimeConfig` paths removed.
- [x] Root `package.json` trimmed to workspace orchestration scripts only.
- [x] `@types/node` moved to `packages/taskflow/devDependencies`.
- [x] `packages/taskflow/tsup.config.ts` `clean` reset to `true`.
- [x] `packages/taskflow/package.json` build path consolidated to a single `build` script.
- [x] `CLAUDE.md` updated to describe the new single-dashboard architecture.

## Quality gates

- [x] `cd packages/taskflow && pnpm typecheck` passes.
- [x] `pnpm test` (taskflow) — 5/5 init tests pass + 2/2 migrate-reviews tests pass.
- [N/A] `npx tsc --noEmit` (root) — root `tsconfig.json` removed with the React app; the only TS code now lives in `packages/taskflow/` and is covered by the package's own `typecheck`.
- [N/A] `pnpm lint` (root) — root `eslint.config.js` removed with the React app; per-package lint is not configured (low value for the small CLI surface).

## Verification

- [x] `node packages/taskflow/dist/cli.js stats` output reports `totalReviews: 28` on this repo (27 N00–N13 review records + 1 from the in-progress N14 review during the fix loop).
- [x] `node packages/taskflow/dist/cli.js show --id N00 --summary` returns `"reviewCount":2,"lastReviewVerdict":"approved"`; `show --id N00` (full) returns the hydrated task with `reviews` inline.
- [x] `node packages/taskflow/dist/cli.js next-review` / `current` / `show --summary` return compact one-line JSON.
- [x] `node packages/taskflow/dist/cli.js migrate-reviews` re-run reports `tasksSplit:[]` AND `shardsTouched:[]`. Re-run after the fix preserved every task's `reviewCount` / `lastReviewVerdict` / `openIncidentCount`.
- [x] Server smoke: `curl /api/work-tasks/tasks-N00-N09.json` returns tasks with `reviews[]` populated from side files; counts match `reviewCount` summary field.
- [x] Dashboard smoke: open `http://localhost:6006`, click a task with reviews (N03 / N08) — detail panel shows the new structured cards (`renderReview` / `renderIncident` etc.), no `<pre>JSON</pre>` blocks.
- [x] Plan file present at `/Users/ssedlak/.claude-personal/plans/optimized-jumping-minsky.md`.
