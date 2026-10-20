# N276 — CI gate + release supply chain — required tests, publish ref guard, pinned tooling, dep bumps, restore mp3s — Checklist

## Done criteria

- [x] `ci.yml` runs typecheck, lint and tests on `pull_request` and `push: main`, SHA-pinned, `contents: read` (A20)
- [x] `release-publish.yml` runs tests before publish, has a ref guard (tag = `v<version>` or `main`), exact npm pin, filtered install (A20, A22, A67)
- [x] The publish artifact gate checks required paths and non-empty binaries; the `grep LICENSE` gate is gone (A65)
- [x] `docs.yml`: `pages`/`id-token` only on the deploy job; all actions SHA-pinned; no `version: 9` (A67)
- [x] All three workflows pin pnpm to one version (`version: 10.12.4`) so CI is consistent; the lockfile is format `9.0` (read by both pnpm 10 and the local 12). NOTE: `packageManager` was tried first (the audit's suggestion) but it made corepack try to switch to a pnpm build this machine doesn't have and broke the pre-commit, so an explicit pinned `version:` is used instead — same consistency goal, no corepack hazard (A68)
- [x] `@modelcontextprotocol/sdk` ≥ 1.32.1 and `react-router-dom` ≥ 6.30.6; the 9 client-only libraries moved to `devDependencies`; `dist` externals unchanged (A66)
- [x] `.github/dependabot.yml` added (npm + github-actions) (A21)
- [x] lint-staged covers `.tsx` and `test/*.mjs`; `packages/taskflow/pnpm-lock.yaml` removed; empty-`RELEASE_PLEASE_TOKEN` step fails clearly (A69)
- [x] `prepublishOnly` no longer builds; CI checks `templates/roles` are in sync (A67)
- [x] Both mp3s restored (26,400 B and 78,576 B), and a test asserts they are non-empty (A65)
- [x] `RELEASING.md` :91 and :96 corrected and new guards documented; `CHANGELOG.md` shipped or the root claim fixed (A22, A71)
- [x] Human-only GitHub settings (code security, required check, environment branch policy) listed in the PR for the human

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes
- [x] `pnpm --dir packages/taskflow test` passes
- [x] No regressions in affected area (`published-surface` green; dashboard and hub still build and serve)

## Verification

- [ ] The new `ci` workflow is green on this task's PR — cannot verify locally (not pushed); workflows were YAML-validated by hand (no tabs, standard structure)
- [x] `pnpm install` with pnpm 12.11.2 refreshed the lockfile (still `lockfileVersion: '9.0'`); build + typecheck + full suite (413/413) green against the bumped deps
- [x] `pnpm audit --prod` recorded: the direct SDK (<1.31) and react-router advisories are resolved (SDK→1.32.1; react-router-dom moved to devDependencies, so it's out of the shipped prod tree). REMAINING: 27 transitive advisories via `@modelcontextprotocol/sdk`'s express/hono OAuth-transport deps (proxy-addr critical, fast-uri, ip-address, hono, qs) — NOT on our stdio-only code path; left to upstream rather than forcing risky `pnpm.overrides` on unreachable code
