# N65 — release v0.11.0 — batch-init, batch-prompt-build, AGENT_ENFORCEMENT in rolesDir

**Type:** feat
**Priority:** high
**Created:** 2026-05-28

## Problem

Two features landed on main since v0.10.0 that consumers need: `batch-ui --init` / `batch-ui --prompt-build` for post-release automation across registered projects, and a fix that writes `AGENT_ENFORCEMENT.md` into `rolesDir` (`.claude/roles/`) instead of the project root for consumer projects. These need to ship as v0.11.0.

## Goal

1. `packages/taskflow/package.json` version bumped to `0.11.0`.
2. `CHANGELOG.md` (root) and `packages/taskflow/CHANGELOG.md` both updated with a `## [0.11.0]` section.
3. Package builds cleanly (`pnpm build`).
4. Package published to npm (`npm publish --access public` from `packages/taskflow/`).
5. Git tag `v0.11.0` created and pushed.

## Scope

### In scope

- `packages/taskflow/package.json` — version field only.
- `CHANGELOG.md` — add `## [0.11.0]` entry above `## [0.10.0]`.
- `packages/taskflow/CHANGELOG.md` — same entry (kept in sync).
- `packages/taskflow/README.md` — add a `### Batch operations` subsection (or equivalent) to the existing `## Multi-project launcher` section. Must cover:
  - `batch-ui --init [--force] [--examples]` — purpose, flags, example output, when to use
  - `batch-ui --prompt-build` — purpose, example output, post-release workflow (upgrade insight-flow → run this to sync all registered projects)
  - Non-interactive / CI mode for both (pipe from `/dev/null` or `< /dev/null`)

### Out of scope

- Source code changes (N64 already merged).
- Any new features.

## Implementation plan

1. **Bump version** — edit `packages/taskflow/package.json`: `"version": "0.11.0"`.

2. **Write changelog entry** — add below `## [Unreleased]` in both `CHANGELOG.md` and `packages/taskflow/CHANGELOG.md`:

   ```markdown
   ## [0.11.0] — 2026-05-28

   ### Added

   - **N64** — `batch-ui --init [--force] [--examples]` runs `insight-flow init` in all (or interactively selected) registered batch-ui projects. Useful after upgrading insight-flow to re-scaffold role files across every consumer project in one command.
   - **N64** — `batch-ui --prompt-build` runs `insight-flow prompt-build --apply` in all (or selected) registered projects. The canonical post-release workflow: after `npm install -g insight-flow@latest`, run `insight-flow batch-ui --prompt-build` to sync `AGENT_ENFORCEMENT.md` and role extensions everywhere.

   ### Fixed

   - **N64** — `prompt-build --apply` now writes `AGENT_ENFORCEMENT.md` into `config.rolesDir` (e.g. `.claude/roles/`) instead of the project root when the project's role files live there. Consumer projects initialised with `insight-flow init` now get the enforcement file co-located with their role files so `@AGENT_ENFORCEMENT.md` references resolve correctly.
   ```

3. **Update README** — scan `packages/taskflow/README.md` for the `batch-ui` command table/section; add `--init [--force] [--examples]` and `--prompt-build` rows.

4. **Build** — `pnpm build` from repo root; confirm no TypeScript errors.

5. **Publish** — `cd packages/taskflow && npm publish --access public`; confirm with `npm view insight-flow version`.

6. **Tag and push** — `git tag v0.11.0 && git push origin v0.11.0`.

## Verification

```bash
pnpm build                          # no errors
npm view insight-flow version       # → 0.11.0
git tag --list | grep v0.11.0       # → v0.11.0
node -e "console.log(require('./packages/taskflow/package.json').version)"  # → 0.11.0
```

## Notes

- Related: N63 (v0.10.0 release) — same files, same pattern.
- Post-publish workflow: `npm install -g insight-flow@0.11.0` then `insight-flow batch-ui --prompt-build` to sync all registered projects.
