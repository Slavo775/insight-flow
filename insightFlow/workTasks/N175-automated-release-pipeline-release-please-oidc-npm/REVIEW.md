# N175 — Automated release pipeline (release-please + OIDC npm publish) + public-repo hardening, then cut v2.0.0 — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-24
**PR:** (no PR yet — reviewed working-tree diff)
**Verdict:** approved

## Summary

Adds the full release pipeline: `release-please` (Release-PR + changelog + version bump, bare `v*` tags) and `release-publish.yml` (publish on `release: published` via npm OIDC Trusted Publishing + provenance, no stored token). Changelogs consolidated to `packages/taskflow/CHANGELOG.md` (canonical) with a hand-written `[2.0.0]` Breaking/Migration entry; root `CHANGELOG.md` reduced to a pointer. Version + manifest bumped to `2.0.0`. Public-repo hardening (least-privilege permissions, SHA-pinned actions, tag/release-only triggers) plus a clean git-history secret scan and a `RELEASING.md` runbook. Low risk: no `src/` behavior changes — only CI/config/docs/version. I independently verified the two failure modes that would actually break the published pipeline (frozen-lockfile sync; provenance `repository` match) and both pass.

## Checklist verification

- [x] `release-please-config.json` + `.release-please-manifest.json` added; single package `packages/taskflow`; `include-component-in-tag: false` → bare `v*` tags — pass
- [x] `release-please.yml` — `push` to `main`, `contents`+`pull-requests` write scoped to the job, action SHA-pinned — pass
- [x] `release-publish.yml` — triggers **only** on `release: published`; `contents: read` + `id-token: write`; `npm publish --provenance`; no `NPM_TOKEN`/`NODE_AUTH_TOKEN` — pass
- [x] `packages/taskflow/CHANGELOG.md` has exactly one `## [2.0.0]` with ⚠ BREAKING CHANGES / Migration (composition v2, N89); history ≤1.0.0 preserved; root reduced to a pointer — pass
- [x] All third-party actions SHA-pinned (checkout, setup-node, release-please-action, pnpm/action-setup); no `pull_request`/`pull_request_target` in any publish-capable workflow — pass
- [x] git-history secret scan run — clean (893 commits; no `.env`/key files) — pass
- [~] PR documents manual prereqs + post-merge cut steps — superseded by `RELEASING.md` (durable runbook); PR pending /task-git — pass-equivalent
- [x] Quality gates: build, 306 tests, typecheck, lint (0 errors) all green — pass

> Note on the original "empty `[Unreleased]`" checklist line: intentionally superseded by the agreed Option A model (release-please owns the changelog going forward; no manual `[Unreleased]` block). Consistent with the chosen approach.

## Non-blocking

1. **`release-publish.yml:39` — `npm install -g npm@latest` is unpinned.** Pulls whatever npm is newest at run time. For reproducibility/supply-chain hygiene on the publish job, consider pinning to a known-good major, e.g. `npm install -g npm@11`.
2. **Redundant build on publish.** The job runs `pnpm build`, then `npm publish` re-triggers `prepublishOnly` (`sync-roles && build && typecheck`). Harmless but doubles build time; could drop the explicit `pnpm build` step and rely on `prepublishOnly`, or vice versa.
3. **`packages/taskflow/CHANGELOG.md:5` date `2026-06-23`.** Hand-stamped; if the actual `v2.0.0` tag lands later, nudge the date at cut time. Cosmetic.

## Security & edge cases

- **Trigger safety (public repo):** `release-publish.yml` fires only on `release: published`; no fork-PR exposure of OIDC/secrets. ✓
- **Least privilege:** top-level `contents: read` in both workflows; jobs elevate only what's needed (`id-token: write` for OIDC; `contents`+`pull-requests` write for release-please). ✓
- **No long-lived credential:** OIDC trusted publishing, no `NPM_TOKEN`. `setup-node` deliberately omits `registry-url` to avoid an empty-token `.npmrc` line. ✓
- **Provenance prerequisite verified:** `package.json.repository.url` = `github.com/Slavo775/insight-flow` matches the building repo, so `--provenance` will not fail. ✓
- **Manifest/registry transient state (fragility, documented):** `.release-please-manifest.json` is `2.0.0` while npm `latest` is still `1.0.0`. In the window between merging the pipeline and creating the `v2.0.0` release, `release-please.yml` may open a premature `2.0.x` PR. `RELEASING.md` tells the human to ignore/close it. Acceptable; the alternative (hold manifest at `1.0.0` until tagged) was traded away to keep manifest/package.json/changelog internally consistent for the direct-tag first cut.

## Notes

- **First-cut mechanic deviates from the literal Q2 "Release-As" answer** — and correctly so. A hand-written curated `[2.0.0]` (required to satisfy "no N82–N174 backfill") is incompatible with `Release-As`, which would prepend a duplicate `[2.0.0]`. Implementer switched the first release to a direct `gh release create v2.0.0`, kept `Release-As` documented for future forced majors, and flagged it to the human. Sound call; no code defect.
- **Human prerequisites remain manual** (out of scope): register the npm trusted publisher for `release-publish.yml` + env `npm-publish`; add required reviewer to the `npm-publish` environment; enable secret scanning / push protection / Dependabot. All captured in `RELEASING.md`.
- No PR yet (branch `null`); no `agents.extend.task-review` command configured → REVIEW.md is the review surface per the output contract's fallback.
- Related: N80 (manual 1.0.0 GA — the pattern this replaces), N89 (composition v2 — the breaking change driving the major).


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-24
**Verdict:** approved

### Summary

Human asked, verbatim:

> i dont want to publish it with push into the master or should i? i wanted to release it when the tag was created is that correct?

Clarified: publish does **not** happen on push to `main` (that only updates the release-please Release PR); `npm publish` runs only via `release-publish.yml` on `release: published`. Confirmed the nuance that the trigger is a published **GitHub Release** (created by merging the release-please PR or by `gh release create`), not a bare `git push --tags`.

Human decision on the publish trigger: **keep "On GitHub Release published" (current implementation)** — chosen over "on `v*` tag push" and "both".

### Blockers

None.

### Non-blocking

Human did not raise additional items. The 3 AI-review nits (Round 1) remain optional and were not requested as changes.

### Notes

Approved as-is. Current trigger model matches the owner's intent. Next: `/task-git` (branch, push, open PR).
