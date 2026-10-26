# N276 — CI gate + release supply chain — required tests, publish ref guard, pinned tooling, dep bumps, restore mp3s — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `8de8b83` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

The workflow and manifest changes are right in shape: a new `ci.yml` (typecheck/lint/test, SHA-pinned, `contents: read`, fork-safe); a publish ref guard that correctly matches release-please's bare `v<version>` tags (`include-component-in-tag: false`); tests and a real pack gate before `npm publish`; Pages/OIDC narrowed to the docs deploy job; dependabot; the stale nested lockfile removed; SDK and react-router bumped; the 9 browser libs out of the runtime tree (dist grep is clean); both mp3s restored to their exact original sizes (26,400 / 78,576 B — verified). **One blocker, and it is the one the audit explicitly predicted (A68):** the root `pnpm-lock.yaml` was rewritten by the local pnpm **12.11.2** and is now a **two-document YAML stream** (a pnpm-12 self-management document first, the real lockfile second). The pnpm **10.12.4** pinned in all three workflows parses the lockfile as a single document and will refuse it under `--frozen-lockfile` — so the new required CI check, the next release's OIDC install, and docs deploys would all go red. The spec's "verify the frozen install with the pinned pnpm" step was skipped; this must be fixed and proven before merge.

## Checklist verification

- [ ] `ci.yml` on PR + push main, SHA-pinned, `contents: read` (A20) — PARTIAL: the file is correct but fails at install (blocker 1)
- [ ] `release-publish.yml` tests before publish, ref guard, exact npm pin, filtered install (A20, A22, A67) — PARTIAL: all present and the guard is correct, but the filtered frozen install hits blocker 1
- [x] Artifact gate: required paths + non-empty binaries; grep gate gone (A65) — pass (`release-publish.yml:74-84`); minor drift — the required-roots list omits `templates/`, `schema/` and the two mp3 paths the spec listed (non-blocking #3)
- [x] `docs.yml`: Pages/OIDC on deploy only, SHA-pinned, no `version: 9` (A67) — pass (`:21-22`, `:64-66`, `:67-69`)
- [ ] One pnpm version across workflows; lockfile readable by it (A68) — NOT MET: three identical `10.12.4` pins, but the lockfile was written by 12.11.2 into a two-document stream; pnpm-10 compatibility was asserted, not tested (blocker 1)
- [x] SDK ≥ 1.32.1, react-router-dom ≥ 6.30.6, 9 libs → devDependencies, dist externals unchanged (A66) — pass (`package.json:46-62, 98-101`; dist grep clean; lockfile importer matches)
- [x] `.github/dependabot.yml` (npm + github-actions) (A21) — pass; will not function until blocker 1 is fixed
- [x] lint-staged `.tsx` + `test/*.mjs`; nested lockfile removed; empty-token step fails (A69) — pass
- [x] `prepublishOnly` no longer builds; CI checks `templates/roles` sync (A67) — pass, with an untracked-file gap (non-blocking #2)
- [x] Both mp3s restored + non-empty test (A65) — pass (sizes verified 26,400 / 78,576 B; `published-surface.test.mjs:75-79`)
- [x] `RELEASING.md` corrected + guards documented; `CHANGELOG.md` shipped (A22, A71) — pass
- [x] Human-only GitHub settings listed — pass (`RELEASING.md:108-112`)

## Blockers

1. **The root `pnpm-lock.yaml` is a two-document YAML stream that the pinned pnpm 10.12.4 will refuse** — `pnpm-lock.yaml:1-13` is a first document (`---`, `lockfileVersion: '9.0'`, an importer `.` holding only `configDependencies: {}` + `packageManagerDependencies: pnpm 12.11.2`, and `@pnpm/exe.*@12.11.2` packages); the real lockfile (settings + the 4 importers) is a second document after another `---`. This is the pnpm-12 self-management layout written by the local `pnpm install` (the checklist records that only 12.11.2 was run). pnpm 9/10 load the lockfile with a single-document YAML parser → "expected a single document in the stream" → `ERR_PNPM_BROKEN_LOCKFILE`. Consumers: `ci.yml:104`, `release-publish.yml:67`, `docs.yml:49` (all pin 10.12.4). Dependabot's npm updater picks its pnpm from `lockfileVersion` (9/10) and would fail to parse it too.
   **Why it matters:** the new *required* CI check is red on every PR, the next release fails at install inside the OIDC job, and docs deploys fail — the audit called this exact failure (A68), and TASK.md step 4 / the verification section required confirming `pnpm install --frozen-lockfile` with the pinned version; that was not done.
   **Fix (pick one, then actually run the CI command with the pinned pnpm before merge):**
   (a) regenerate the lockfile with the CI version — `npx pnpm@10.12.4 install` at the root (single-document output) — and stop the local 12.x from rewriting it (e.g. `"packageManager": "pnpm@10.12.4"` with pnpm's own `manage-package-manager-versions`, or `corepack disable` if corepack was what broke the pre-commit earlier); or
   (b) pin all three workflows to the writer, `version: 12.11.2` (check pnpm 12's Node floor; if it needs Node 22, bump `node-version` in all three and drop the now-stale npm-11 rationale at `release-publish.yml:62-64`).
   Then prove it locally: `npx pnpm@<pinned> install --frozen-lockfile --filter insight-flow...` **and** `npx pnpm@<pinned> install --frozen-lockfile` (the docs path) must both exit 0.

## Non-blocking

1. `ci.yml:96` / `docs.yml:35` pin `actions/checkout@11d5960a…` while `release-publish.yml:40` keeps `34e11487…` (v4.3.1). **Resolved by the orchestrator:** `11d5960a…` is a real `actions/checkout` commit ("backport fixes to releases-v4 (#2524)", resolved via `gh api` from the `v4` tag). Not a defect; aligning all three on one SHA is tidier.
2. `ci.yml:108` — `git diff --exit-code packages/taskflow/templates/roles` ignores UNTRACKED files; a new name in `ROLE_FILES` copied for the first time passes silently. Fix: `test -z "$(git status --porcelain -- packages/taskflow/templates/roles)"`.
3. `release-publish.yml:80` — `need` omits `templates/`, `schema/` and the two `dist/sounds/*.mp3` the spec listed. Covered one step earlier by `published-surface.test.mjs:52-64`, but the gate is meant to be self-contained — add them (one line).
4. `docs.yml:40` — pnpm 9 → 10.12.4 silently changes behaviour for the Docusaurus tree: pnpm 10 blocks dependency build scripts (no `onlyBuiltDependencies`, `.npmrc` or `.pnpmfile.cjs` anywhere). Run `pnpm --dir website build` once under the pinned pnpm; add `pnpm.onlyBuiltDependencies` only if a dep needs it.
5. Ref guard (`release-publish.yml:54`) checks the tag NAME only; tags are mutable, so a collaborator can `git tag -f v<version>` on any commit whose `package.json` carries that version. The real control is the `npm-publish` required reviewer, not the `v*` environment policy — `RELEASING.md:111-112` should say so.
6. `release-publish.yml:66` `npm install -g npm@11.5.1` inside the OIDC job — exact pin, registry integrity only, no provenance. Accepted residual (npm has no install scripts; `--ignore-scripts` is a free extra).
7. `ci.yml:112` — `pnpm --dir packages/taskflow test` is the full spawned-server suite (fixed ports; master-boot known flaky) and will be a REQUIRED check → expect spurious reds until N286 lands its port isolation. Consider merging N286 first, or a retry.
8. `--filter insight-flow...` also matches the ROOT project (root `package.json` is named `insight-flow` too), so root devDeps (husky/lint-staged/yalc) install and `prepare: husky` runs in the OIDC job. Harmless (worked unfiltered before), but not the "taskflow only" the comment implies; rename the root to `insight-flow-monorepo` if the filter should mean what it says.
9. CHECKLIST.md:9 marks A68 done, but A68's root cause (CI pnpm ≠ local pnpm) is exactly blocker 1; three identical `version:` pins do not pin "in one place" as the spec asked.

## Security & edge cases

- Verified closed: tag format — `release-please-config.json:9 include-component-in-tag: false`, all 19 existing tags are bare `v2.x.y`, manifest = `package.json` = 2.12.0; for `release: published` `GITHUB_REF` is `refs/tags/<tag>`, so the guard matches real releases and rejects a tag ≠ package version. `setup-node` precedes the `node -p` guard; the guard runs at the repo root with the right path. Pack check: no single quote inside the `node -e` body; `--json` puts only the JSON array on stdout (notices go to stderr); the shape matches what `published-surface` already parses; `bash -eo pipefail` fails the step on either command. `sync-role-templates.mjs` is `node:fs` only and writes only `templates/roles`. `docs.yml`: workflow `contents: read`, Pages/OIDC only on deploy, `environment: github-pages` intact, deploy job runs only `deploy-pages`. Shipped runtime deps = sdk + zod (+ optional langfuse peer); dist/*.js and *.d.ts have zero hits for the 9 moved libs. `ci.yml` fork safety: no `id-token`, no secrets, no `pull_request_target`, no `${{ github.event.* }}` in any `run:`; PR cache scope isn't readable by main; `cancel-in-progress` only supersedes an older main run. `release-please.yml` tests `-z "$RP_TOKEN"` only, never prints it. No `onlyBuiltDependencies` / `.npmrc` / `.pnpmfile.cjs` / `postinstall` anywhere → pnpm 10 blocks dependency scripts in the OIDC job. The other SHA pins resolve to real tags (setup-node v4.4.0, pnpm/action-setup v4.3.0, upload-pages-artifact v3.0.1, deploy-pages v4.0.5, release-please v4.4.1, checkout v4.3.1).

## Notes

- Fix order: blocker 1 (regenerate the lockfile with the pinned pnpm — option (a) is the smaller change — and run both frozen installs locally; update CHECKLIST line 9 to describe the real state) → #2 (untracked-file sync check) and #3 (self-contained pack gate) are quick wins → #7 is a scheduling note for making `ci` required.
- Lesson recorded for the implementer: a lockfile rewrite must be produced by (or proven against) the exact pnpm the workflows pin — the `---` on line 1 was visible and dismissed.
- Hand-off: `/task-review-fix N276` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — two-document lockfile unreadable by the pinned pnpm — FIXED.**
- Root cause confirmed: local pnpm is **12.11.2** (`engines: node >=18.*`), which writes the 2-doc `lockfileVersion: '9.0'` stream; pnpm 10.12.4 cannot parse it.
- Fix chosen: **option (b)** — pinned all three workflows to the writer, `version: 12.11.2` (`ci.yml:27`, `release-publish.yml:43`, `docs.yml:40`). No Node bump (pnpm 12 runs on the Node 20 runner); the npm@11.5.1 pin is about npm, unchanged. No `packageManager`/corepack (it broke the pre-commit earlier).
- Second CI breakage found while verifying: pnpm 12 **errors** `ERR_PNPM_IGNORED_BUILDS` on install when deps have un-run build scripts (esbuild, core-js) — would red every workflow regardless of pnpm version. Fixed in `pnpm-workspace.yaml`: `onlyBuiltDependencies: [esbuild, core-js]` + `strictDepBuilds: false`.
- Proven locally: `pnpm install --frozen-lockfile --filter insight-flow...` → exit 0; `pnpm install --frozen-lockfile` (docs path) → exit 0; `pnpm --dir packages/taskflow run build` → exit 0 (esbuild works with its script skipped). Lockfile stays 2-doc / 9.0, unchanged by the installs.

**Non-blocking addressed:**
- #1 checkout SHA aligned — all three workflows now pin `34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1` (a tagged release).
- #2 `ci.yml` role-template sync now uses `test -z "$(git status --porcelain …)"`, so untracked (newly-copied) templates no longer pass silently.
- #3 pack gate `need` is now self-contained: added the two `dist/sounds/*.mp3`, a `templates/roles/*` and a `schema/*.json` path (gate passes, 39 files).
- #5 `RELEASING.md` now states the ref guard checks the tag name only (tags are mutable) and the real control is the required reviewer on the `npm-publish` environment.
- #9 `CHECKLIST.md` line 9 rewritten to describe the real pnpm-12 state and the verification done.

**Non-blocking deliberately left (with reason):**
- #4 docs `pnpm --dir website build` under the pinned pnpm — the install-error cause (ignored builds) is fixed by `strictDepBuilds: false`; core-js's script is only a funding banner, so skipping is safe. A full Docusaurus build was not re-run here (heavy, network).
- #6 npm@11.5.1 exact pin — accepted residual (npm has no install scripts).
- #7 full spawned-server suite as a required check (master-boot flakiness) — sequencing note; the root fix is N286's port isolation, not a workflow change.
- #8 `--filter insight-flow...` also matching the root project — harmless; renaming the root package risks yalc/script breakage for no correctness gain.
