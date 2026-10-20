# N276 — CI gate + release supply chain — required tests, publish ref guard, pinned tooling, dep bumps, restore mp3s

**Type:** chore
**Priority:** high
**Created:** 2026-10-19

## Problem

Nothing in CI runs the 415 tests, lint or typecheck. `main` has no required status checks, and the publish job ships without testing. `workflow_dispatch` can publish any branch, and the `npm-publish` environment has no branch policy. `docs.yml` grants Pages + OIDC to its build job. Actions there are pinned by tag, npm floats, three pnpm majors are in play, and the publish job installs the whole workspace next to the OIDC token. Dependabot alerts, security updates and secret scanning are all **disabled** on this public repo. The MCP SDK and react-router carry known advisories (30 on taskflow paths, incl. a critical transitive one). Nine browser-only libraries are shipped as runtime dependencies. The only publish artifact check is `grep LICENSE`, which let two 0-byte mp3 files ship in every release since 2.0.0. Source: `N271/AUDIT.md` **A20, A21, A22, A65** (mp3 + pack gate), **A66, A67, A68, A69, A71** (RELEASING.md + CHANGELOG `files`).

## Goal

1. Every PR and push to `main` runs typecheck, lint and tests, and the publish job runs tests before `npm publish`.
2. Publishing is only possible from `main` or a matching `v*` tag.
3. Workflow permissions are least-privilege, actions are SHA-pinned, and pnpm/npm versions are pinned in one place.
4. Known advisories on the published dependency tree are fixed, and client-only libraries are no longer runtime dependencies.
5. The tarball gate checks real content (incl. non-empty binaries), and the two mp3 files are restored.

## Scope

### In scope

- `.github/workflows/` — new `ci.yml`; `release-publish.yml`; `docs.yml`; `release-please.yml`.
- New `.github/dependabot.yml`.
- Root `package.json` (`packageManager`, lint-staged glob), `.husky/pre-commit` only if the glob change needs it.
- `packages/taskflow/package.json` — deps/devDeps, `files`, `prepublishOnly`.
- Root `pnpm-lock.yaml` (refresh); delete `packages/taskflow/pnpm-lock.yaml`.
- `packages/taskflow/src/dashboard/server/sounds/*.mp3` (restore content).
- `packages/taskflow/test/published-surface.test.mjs` (assert non-empty mp3s).
- `RELEASING.md`.

### Out of scope

- Migrating to react-router 7. Two react-router moderates are only fixed in ≥7.18; document them as accepted for now.
- Docs website content.
- Test-suite flakiness fixes (ports, timeouts) → N286.
- `CLAUDE.md` / README drift → N286.

## Implementation plan

1. **`ci.yml` (A20).** On `pull_request` and `push: main`: checkout → `pnpm/action-setup` (version from `packageManager`) → `setup-node` 20 with pnpm cache → `pnpm install --frozen-lockfile --filter insight-flow...` → `typecheck` → `lint` → `test`. Top-level `permissions: contents: read`. Pin actions by SHA (reuse the SHAs already in `release-publish.yml`).
2. **Publish job (A20, A22, A65, A67).** In `release-publish.yml`:
   - Add a `test:node` step after build and before publish.
   - Add a ref guard that fails unless `GITHUB_REF == refs/tags/v<package.json version>`, or the event is `workflow_dispatch` on `refs/heads/main`.
   - Pin npm to an exact version.
   - Install with `--filter insight-flow...`.
   - Replace the `grep LICENSE` gate with `npm pack --dry-run --json --ignore-scripts` plus a small node check: required paths present (LICENSE, README.md, `dist/cli.js`, `dist/index.js`, `dist/dashboard/index.html`, `templates/`, `schema/`) and every `.mp3`/binary has `size > 0`.
3. **`docs.yml` (A67).** Workflow-level `permissions: contents: read`; move `pages: write` + `id-token: write` to the `deploy` job only. Pin `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/upload-pages-artifact`, `actions/deploy-pages` by SHA. Remove `version: 9`.
4. **One pnpm version (A68).** Root `package.json`: `"packageManager": "pnpm@10.12.4"`. Remove `version:` from every `pnpm/action-setup` step. The lockfile is `lockfileVersion: '9.0'`, which pnpm 10 reads; confirm `pnpm install --frozen-lockfile` passes locally with pnpm 10.
5. **Dependencies (A66).**
   - Bump `@modelcontextprotocol/sdk` to `^1.32.1` and `react-router-dom` to `≥6.30.6`.
   - Move `react`, `react-dom`, `@xyflow/react`, `react-markdown`, `react-router-dom`, `rehype-sanitize`, `remark-gfm`, `styled-components`, `zustand` to `devDependencies`.
   - Refresh the lockfile and rebuild.
   - Confirm `dist/cli.js` and `dist/index.js` still import only `@modelcontextprotocol/sdk`, `zod` and node builtins, and that `published-surface.test.mjs` passes.
   - Re-run `pnpm audit --prod` and record the before/after counts in the PR.
6. **Supply-chain hygiene (A21, A69).**
   - Add `.github/dependabot.yml`: npm, directory `/`, weekly, group minor+patch; plus github-actions weekly.
   - Change the lint-staged glob to `packages/taskflow/src/**/*.{ts,tsx}` and add `packages/taskflow/test/**/*.mjs`.
   - `git rm packages/taskflow/pnpm-lock.yaml`.
   - In `release-please.yml`, add a step that fails clearly when `RELEASE_PLEASE_TOKEN` is empty (check via `env`, since `if:` can't read secrets).
7. **Publish artifact = tag (A67).** Drop `build` from `prepublishOnly` (CI already builds). Add a CI step `node packages/taskflow/scripts/sync-role-templates.mjs && git diff --exit-code packages/taskflow/templates/roles`.
8. **Restore mp3s (A65).**
   - `git cat-file blob 99808c8b6399ffa82a074ffeb0f180ec9afd3920 > packages/taskflow/src/dashboard/server/sounds/idle-ping.mp3`
   - `git cat-file blob 2777a302675317203c1ff744235349a8097ba543 > packages/taskflow/src/dashboard/server/sounds/permission-alert.mp3`
   - Expected sizes: 26,400 and 78,576 bytes. Extend `published-surface.test.mjs` to assert `size > 0`.
9. **Docs (A22, A71).** Fix `RELEASING.md` :91 (triggers) and :96 (SHA pins), and document the new guards plus the PAT expiry. Add `CHANGELOG.md` to `files`, or fix the root `CHANGELOG.md` :3-5 sentence (choose one; prefer shipping it).
10. **Human-only steps.** Do NOT do these without explicit approval; list them in the PR for the human:
    - GitHub → Settings → Code security: enable Dependabot alerts, Dependabot security updates, secret scanning and push protection.
    - Branch protection on `main`: require the `ci` check.
    - Environment `npm-publish`: deployment branches/tags = `main` + `v*`; enable `prevent_self_review` if desired.

## Verification

- `ci.yml` runs green on the PR for this task.
- Locally: `pnpm install --frozen-lockfile` with pnpm 10.12.4 passes; `pnpm --dir packages/taskflow test` passes.
- `npm pack --dry-run --json --ignore-scripts` in `packages/taskflow` shows both mp3s with size > 0, and the new gate script passes; it fails on a deliberately emptied mp3.
- `pnpm audit --prod` in `packages/taskflow` shows the SDK and react-router-dom 6.x advisories gone (remaining ones listed in the PR).
- `actionlint` (if available) or a dry review confirms no workflow-level `pages`/`id-token` remain in `docs.yml`.

## Notes

- Detail and evidence: `N271/AUDIT.md` A20–A22, A65–A69, A71. `gh api` outputs were captured in the audit (branch protection empty, `deployment_branch_policy: null`, `security_and_analysis` all disabled).
- Release-process memory: npm@latest v12 breaks the Node 20 publish (hence the npm 11.x pin). Approve publish deployments via `gh api pending_deployments`.
- Project memory: pre-commit runs prettier + eslint `--fix` + typecheck, so prune unused imports before committing.
- No dependency; can start now. Merge this early: every later task then gets CI.
- Recommended run: `/task-analyze N276` → `/task-implement N276`.
