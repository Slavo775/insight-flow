# N10 — Refactor taskflow binary path resolution to be project-root relative

**Type:** rework
**Priority:** high
**Created:** 2026-05-20

## Problem

Per REVIEW_ANALYSIS.md § 2 ("Path Management") and § 5 Phase 3.2, the taskflow binary resolves paths using `__dirname`-relative logic with deep `../../..` traversals. This breaks when the package is installed globally (`npm i -g insight-flow`) or when the binary runs from a different working directory than the one where `workTasks/` lives. Paths to data (`workTasks/master.json`, shard files) must resolve from the **consumer's project root** (detected once at startup), and paths to bundled assets (templates, UI bundle) must resolve from the **package install location** — these are two different anchors and they're currently conflated.

## Goal

1. A single `resolveProjectRoot()` helper finds the consumer's project root (the directory containing `workTasks/master.json`, walked up from `process.cwd()`).
2. A single `resolvePackageAsset(name)` helper finds files shipped with the package (templates, dist assets) using `import.meta.url`.
3. No `../../..` literal path segments anywhere in `packages/taskflow/src/`.
4. The binary works identically from any subdirectory of the consumer project (parity with `git`).
5. The binary works when installed globally — `npx insight-flow current` from a project root resolves to that project's `workTasks/`.
6. A clear error message when the binary is run outside any project (no `workTasks/master.json` found in any parent).

## Scope

### In scope

- `packages/taskflow/src/storage.ts` — replace any `__dirname` or `../../..` path computation with `resolveProjectRoot()`.
- `packages/taskflow/src/init/index.ts` — `resolvePackageAsset()` for templates.
- `packages/taskflow/src/server/dashboard.ts` — `resolvePackageAsset()` for `dist/ui` (coordinate with [[N09]]).
- A new helper module, e.g., `packages/taskflow/src/paths.ts`.
- Custom `TaskflowProjectNotFoundError` for the "ran outside a project" case.

### Out of scope

- Changing the on-disk shape of `workTasks/` (still master + shards).
- Adding a `taskflow.config.json` (separate task if we want explicit project markers).
- Init template content ([[N08]]).
- UI build location ([[N09]]).

## Implementation plan

1. **Audit current path logic**
   - `grep -rn "__dirname\|fileURLToPath\|\.\./\.\./" packages/taskflow/src/` to find every existing path computation.
   - Catalog: which call sites want the consumer project root, which want the package install location.
2. **Author `packages/taskflow/src/paths.ts`**
   - `resolveProjectRoot(start = process.cwd()): string` — walks up from `start` looking for `workTasks/master.json`; throws `TaskflowProjectNotFoundError` if none found before filesystem root.
   - `resolvePackageAsset(relPath: string): string` — uses `fileURLToPath(import.meta.url)` to anchor on the package, then `path.resolve(packageRoot, relPath)`.
   - Cache `resolveProjectRoot()` result per process (it's expensive on cold call but never changes mid-run).
3. **Replace path computation in `storage.ts`**
   - Every read/write of `workTasks/...` goes through `resolveProjectRoot()`.
4. **Replace path computation in `init/index.ts`**
   - Templates resolved via `resolvePackageAsset("templates/roles")`.
5. **Replace path computation in `server/dashboard.ts`**
   - UI served from `resolvePackageAsset("dist/ui")`.
6. **Error UX**
   - Top-level CLI handler catches `TaskflowProjectNotFoundError` and prints: `error: no insight-flow project found (searched upward from <cwd>). Run \`insight-flow init\` to create one.`
7. **Smoke tests**
   - From repo root: `insight-flow current` works.
   - From `workTasks/`: `insight-flow current` works (subdirectory walk-up).
   - From `/tmp` (no project): `insight-flow current` fails with the friendly error.
   - Global install: `npm pack && npm i -g ./insight-flow-X.Y.Z.tgz && cd /path/to/project && insight-flow current` works.
8. **Confirm no `../../..` remains**
   - `grep -rn "\.\./\.\./" packages/taskflow/src/` returns zero matches.

## Verification

- `insight-flow current` works from repo root.
- `insight-flow current` works from `workTasks/` subdirectory (resolves project root upward).
- `insight-flow current` from `/tmp` (or any non-project directory) prints the "no project found" error and exits non-zero.
- A globally-installed `insight-flow` (`npm i -g ./<tarball>`) executes correctly against a project elsewhere on the filesystem.
- `grep -rn "\.\./\.\./" packages/taskflow/src/` returns zero matches.
- `grep -rn "__dirname" packages/taskflow/src/` returns zero matches (use `import.meta.url` instead).

## Notes

- Source: REVIEW_ANALYSIS.md § 2 (Path Management), § 5 Phase 3.2.
- Pairs with [[N08]] (init templates) and [[N09]] (UI build) — both depend on `resolvePackageAsset()`. Land N10 first, or coordinate so all three converge on the same helper module.
- Don't add a `taskflow.config.json` marker file just yet — `workTasks/master.json` is a reliable marker and avoids the extra config burden. If we add explicit config later, the marker check goes through this same helper.
- The walk-up algorithm should bail at filesystem root (`/` on POSIX, drive root on Windows) to avoid infinite loops on symlink cycles.
