# N04 — Publish package to npm as `insight-flow` under sslavo account

**Type:** feat
**Priority:** high
**Created:** 2026-05-18

## Problem

- The `packages/taskflow` package was prepared for npm in N03 but never shipped. The bare name `taskflow` is taken on npm by an unrelated project (intuitivcloud/taskflow), so a rename is required before the first publish.
- We want the package live on npm under the user's account `sslavo` (currently only hosting `react-enhanced-image`) so it can be installed via `npx insight-flow` / `npm i insight-flow`.

## Goal

1. Rename the publishable package from `taskflow` to `insight-flow` everywhere it appears (package metadata, bin name, README usage examples, internal scripts).
2. Verify the rename does not break the build, the bundled UI build script, or the CLI entry point.
3. Publish version `0.2.0` (or bump to `0.3.0` if the rename warrants it) to npm under the `sslavo` account with public access.
4. Confirm the published package is installable and the `insight-flow` bin runs end-to-end (`npx insight-flow@latest init` in a scratch dir).
5. Update repo docs (root README, package README) to reference the new install command.

## Scope

### In scope

- `packages/taskflow/package.json` — change `name` to `insight-flow`, update `bin` key, bump version, keep `publishConfig.access: public`.
- `packages/taskflow/README.md` — update install / npx examples.
- Root `package.json` scripts (`build:package`, `pack:taskflow`) — paths stay the same (folder is still `packages/taskflow`), but rename script keys to `pack:insight-flow` if it improves clarity (optional).
- `scripts/build-taskflow-ui.mjs` — audit for any hardcoded `taskflow` strings that affect the published artifact (output paths, banner text). Filename can stay.
- Root `README.md` — update any "install taskflow" references to `insight-flow`.
- Verify `npm login` is active as `sslavo` and run `pnpm --dir packages/taskflow publish` (or `npm publish` from inside the package dir).

### Out of scope

- Renaming the folder `packages/taskflow` → `packages/insight-flow` (keep folder name to minimize diff; only the published `name` changes).
- Renaming the GitHub repo or the dashboard SPA.
- Setting up CI-based publishing / changesets / automated release notes — manual publish for this first cut.
- Adding a scoped variant (`@sslavo/insight-flow`) — unscoped name is available, use it directly.

## Implementation plan

1. **Audit current `taskflow` references in the publishable artifact**
   - Grep `packages/taskflow/` and `scripts/build-taskflow-ui.mjs` for the string `taskflow` (case-insensitive).
   - Classify each hit: must-rename (package metadata, bin, install instructions) vs. keep (internal folder names, role docs, historical task IDs).

2. **Update `packages/taskflow/package.json`**
   - `name`: `"taskflow"` → `"insight-flow"`.
   - `bin`: `{ "taskflow": "./dist/cli.js" }` → `{ "insight-flow": "./dist/cli.js" }`.
   - Bump `version` to `0.3.0` (minor bump to signal the rename — first publish under new name).
   - Leave `publishConfig`, `repository`, `homepage`, `bugs` as-is (still point to insight-flow repo).

3. **Update package README and any CLI banner**
   - `packages/taskflow/README.md`: replace `npx taskflow` / `npm i taskflow` examples with `npx insight-flow` / `npm i insight-flow`.
   - If `src/cli.ts` prints a program name or help banner, update it.
   - If `tsup.config.ts` sets a banner, audit it.

4. **Rebuild and verify locally**
   - `pnpm --dir packages/taskflow run build` — confirm `dist/cli.js` and `dist/index.js` are produced.
   - `pnpm --dir packages/taskflow run typecheck` — no type errors.
   - `cd /tmp && mkdir if-publish-test && cd if-publish-test && npm init -y && npm pack /abs/path/to/packages/taskflow` then `npm i ./insight-flow-0.3.0.tgz` and run `npx insight-flow init` — confirm the CLI runs and scaffolds files.

5. **Publish to npm**
   - Confirm `npm whoami` returns `sslavo` (prompt user to `npm login` if not).
   - From `packages/taskflow/`, run `npm publish` (the `prepublishOnly` script will rebuild + typecheck).
   - Verify on npm: `npm view insight-flow` should return the new package.

6. **Smoke test the published package**
   - In a fresh dir: `npx insight-flow@0.3.0 init` — confirm scaffolding works end-to-end and the bundled UI is included.
   - Document any issues found and fix in a follow-up patch version.

7. **Update root docs**
   - Root `README.md`: add a short "Install" section pointing to `npm i insight-flow` or `npx insight-flow`.
   - Mention the rename in the package README's changelog / version history section if one exists.

8. **Hand off to `/task-git`**
   - Branch name: `feat/N04-publish-insight-flow-npm`.
   - Commit the rename + version bump; create PR.
   - Note: the actual `npm publish` step should happen from the merged main branch (or from the feature branch with user approval) — flag this in the PR description so reviewers know publish is a manual post-merge step.

## Verification

- `npm view insight-flow` returns version `0.3.0` with the correct repo/homepage links and `sslavo` as the maintainer.
- `npx insight-flow@latest --help` (or equivalent) prints usage info.
- `npx insight-flow@latest init` in an empty directory produces the expected scaffolded files (skills, CLAUDE.md, schema, etc.).
- `grep -ri "npm i taskflow\|npx taskflow" packages/taskflow README.md` returns zero hits (all renamed).
- `git diff` shows only the rename + version bump + doc updates (no accidental refactors).

## Notes

- The `taskflow` name on npm is owned by intuitivcloud/taskflow (1.0.1, last published >1 year ago). Don't try to publish under that name — npm will reject with 403.
- Reference: N03 (`workTasks/N03-publish-taskflow-npm/`) did the publish-prep work — exports, files allowlist, build pipeline, `prepublishOnly`. N04 is purely the rename + actual publish.
- Folder `packages/taskflow/` stays as-is to minimize churn; only the published `name` changes. If we later want the folder renamed, do it as a separate refactor task.
- The `sslavo` account already has `react-enhanced-image` published, so 2FA / publish flow is presumed already configured.
