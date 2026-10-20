# N276 — CI gate + release supply chain — required tests, publish ref guard, pinned tooling, dep bumps, restore mp3s — Checklist

## Done criteria

- [ ] `ci.yml` runs typecheck, lint and tests on `pull_request` and `push: main`, SHA-pinned, `contents: read` (A20)
- [ ] `release-publish.yml` runs tests before publish, has a ref guard (tag = `v<version>` or `main`), exact npm pin, filtered install (A20, A22, A67)
- [ ] The publish artifact gate checks required paths and non-empty binaries; the `grep LICENSE` gate is gone (A65)
- [ ] `docs.yml`: `pages`/`id-token` only on the deploy job; all actions SHA-pinned; no `version: 9` (A67)
- [ ] Root `package.json` has `"packageManager": "pnpm@10.12.4"`; no `version:` in any `pnpm/action-setup` step (A68)
- [ ] `@modelcontextprotocol/sdk` ≥ 1.32.1 and `react-router-dom` ≥ 6.30.6; the 9 client-only libraries moved to `devDependencies`; `dist` externals unchanged (A66)
- [ ] `.github/dependabot.yml` added (npm + github-actions) (A21)
- [ ] lint-staged covers `.tsx` and `test/*.mjs`; `packages/taskflow/pnpm-lock.yaml` removed; empty-`RELEASE_PLEASE_TOKEN` step fails clearly (A69)
- [ ] `prepublishOnly` no longer builds; CI checks `templates/roles` are in sync (A67)
- [ ] Both mp3s restored (26,400 B and 78,576 B), and a test asserts they are non-empty (A65)
- [ ] `RELEASING.md` :91 and :96 corrected and new guards documented; `CHANGELOG.md` shipped or the root claim fixed (A22, A71)
- [ ] Human-only GitHub settings (code security, required check, environment branch policy) listed in the PR for the human

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`published-surface` green; dashboard and hub still build and serve)

## Verification

- [ ] The new `ci` workflow is green on this task's PR
- [ ] `pnpm install --frozen-lockfile` with pnpm 10.12.4 passes locally
- [ ] `pnpm audit --prod` before/after counts recorded in the PR
