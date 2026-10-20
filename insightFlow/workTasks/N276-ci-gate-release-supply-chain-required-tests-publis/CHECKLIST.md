# N276 — CI gate + release supply chain — required tests, publish ref guard, pinned tooling, dep bumps, restore mp3s — Checklist

## Done criteria

- [x] `ci.yml` runs typecheck, lint and tests on `pull_request` and `push: main`, SHA-pinned, `contents: read` (A20)
- [x] `release-publish.yml` runs tests before publish, has a ref guard (tag = `v<version>` or `main`), exact npm pin, filtered install (A20, A22, A67)
- [x] The publish artifact gate checks required paths and non-empty binaries; the `grep LICENSE` gate is gone (A65)
- [x] `docs.yml`: `pages`/`id-token` only on the deploy job; all actions SHA-pinned; no `version: 9` (A67)
- [x] All three workflows pin pnpm to **`version: 12.11.2`** — the exact pnpm that writes the local `pnpm-lock.yaml`, so CI reads the lockfile the repo actually ships (A68). FIX (review): the first attempt pinned `10.12.4`, but the local pnpm 12 writes a **two-document** `lockfileVersion: 9.0` stream that pnpm 10 cannot parse (`ERR_PNPM_BROKEN_LOCKFILE`) — proven by `pnpm@10.12.4 install --frozen-lockfile` failing. Pinning CI to the writer (pnpm 12, `engines: node >=18.*`, runs on the Node 20 runner) keeps the lockfile valid with no local-toolchain surgery. `packageManager`/corepack was avoided (it broke the pre-commit earlier). Separately, pnpm 12 **errors** (`ERR_PNPM_IGNORED_BUILDS`) on install when deps have un-run build scripts, so `pnpm-workspace.yaml` now sets `onlyBuiltDependencies: [esbuild, core-js]` + `strictDepBuilds: false`. Verified: `pnpm install --frozen-lockfile --filter insight-flow...` **and** `pnpm install --frozen-lockfile` (docs path) both exit 0, and `pnpm --dir packages/taskflow run build` succeeds (esbuild works with its script skipped, via its `@esbuild/<platform>` optional dep).
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
