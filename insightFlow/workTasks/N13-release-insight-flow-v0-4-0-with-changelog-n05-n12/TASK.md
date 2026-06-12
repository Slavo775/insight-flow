# N13 — Release insight-flow v0.4.0 with changelog N05–N12

**Type:** feat
**Priority:** high
**Created:** 2026-05-21

## Problem

- `packages/taskflow` is at `0.3.1` but 8 significant tasks (N05–N12) have been merged since the last release.
- Users installing `npm install -g insight-flow` get a stale version missing Zod validation, init improvements, path-resolution fixes, agent enforcement, and custom agent extensibility.

## Goal

1. Bump `packages/taskflow/package.json` version to `0.4.0`.
2. Write a `CHANGELOG.md` entry for `v0.4.0` covering all changes from N05–N12.
3. Build the package (`pnpm run build`) and verify it passes typecheck.
4. Publish to npm (`npm publish`) under the `insight-flow` package name.
5. Create and push a git tag `v0.4.0` on main.

## Scope

### In scope

- `packages/taskflow/package.json` — version bump to `0.4.0`.
- `packages/taskflow/CHANGELOG.md` — new `v0.4.0` section (create file if absent).
- `pnpm run build` in `packages/taskflow/`.
- `npm publish` from `packages/taskflow/`.
- `git tag v0.4.0` + `git push origin v0.4.0`.

### Out of scope

- Version bumps anywhere else in the monorepo.
- Changing any source code.
- Publishing the dashboard / UI separately.

## Implementation plan

1. **Bump version**
   - Edit `packages/taskflow/package.json`: `"version": "0.3.1"` → `"version": "0.4.0"`.

2. **Write CHANGELOG.md**
   - Create or prepend to `packages/taskflow/CHANGELOG.md`.
   - Add a `## [0.4.0] — 2026-05-21` section with the following entries:

   ```
   ### Breaking changes
   - None.

   ### Features
   - N07: Zod schema validation on all taskflow storage read/write paths — invalid task data now throws `TaskflowValidationError` instead of silently corrupting.
   - N08: Role definition files (`TASK_*_ROLE.md`) now bundled in the package and scaffolded to `.claude/roles/` by `insight-flow init`.
   - N12: `agents.extend` — inject project-specific rules into built-in agent role files via `taskflow.config.json`. Re-running `init` is idempotent.
   - N12: `agents.custom` — register new Claude Code skills from config; generates `.claude/commands/<name>.md` with `@AGENT_ENFORCEMENT.md` reference and adds rows to CLAUDE.md.
   - N12: JSON schema for `taskflow.config.json` at `schema/taskflow.config.schema.json`.

   ### Improvements
   - N05: Role files migrated out of `scripts/` into the `insight-flow` binary; `scripts/task-tracker.mjs` deleted.
   - N06: `packages/taskflow` is now the single source of truth for all CLI logic.
   - N09: Vite UI build standardised; output goes to `dist/ui/`.
   - N10: Binary path resolution is now project-root relative — works correctly when called from any subdirectory.
   - N11: Agent roles now enforce CLI-only mutations; `gh` and `git` permissions wired into agent enforcement rules.
   ```

3. **Build**
   - Run `pnpm --filter insight-flow run build` — must complete without errors.
   - Run `npx tsc --noEmit` in `packages/taskflow/` — must pass.

4. **Publish**
   - `cd packages/taskflow && npm publish --access public`
   - Confirm the published version is `0.4.0` on npm.

5. **Tag and push**
   - `git add packages/taskflow/package.json packages/taskflow/CHANGELOG.md`
   - `git commit -m "chore(release): bump insight-flow to v0.4.0"`
   - `git tag v0.4.0`
   - `git push origin main --tags`

## Verification

- `npm show insight-flow version` returns `0.4.0`.
- `npx insight-flow --version` prints `0.4.0`.
- `pnpm run build` exits 0 in `packages/taskflow/`.
- `git tag --list 'v0.4.0'` shows the tag on main.

## Notes

- Publish requires npm auth — run `npm whoami` first; if not logged in, `npm login`.
- Related tasks: N05, N06, N07, N08, N09, N10, N11, N12.
- Previous release was `0.3.1` (no CHANGELOG existed — create fresh).
