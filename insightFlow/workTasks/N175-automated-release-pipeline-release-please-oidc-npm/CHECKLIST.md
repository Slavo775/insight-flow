# N175 — Automated release pipeline (release-please + OIDC npm publish) + public-repo hardening, then cut v2.0.0 — Checklist

## Done criteria

- [ ] `release-please-config.json` + `.release-please-manifest.json` added; single package `packages/taskflow` seeded at `1.0.0`; tags emit bare `v*` (no package prefix).
- [ ] `.github/workflows/release-please.yml` added — `push` to `main`, `permissions: contents+pull-requests write`, action SHA-pinned.
- [ ] `.github/workflows/release-publish.yml` added — triggers **only** on `release: published`, `permissions: contents: read` + `id-token: write`, publishes via OIDC with `--provenance`, no `NPM_TOKEN`.
- [ ] `packages/taskflow/CHANGELOG.md` seeded with `## [2.0.0]` incl. Breaking Changes / Migration (module composition v2) + empty `## [Unreleased]`; root `CHANGELOG.md` reduced to a pointer.
- [ ] All third-party actions SHA-pinned; no `pull_request`/`pull_request_target` in any publish-capable workflow.
- [ ] git-history secret scan run; result recorded in PR description.
- [ ] PR documents the manual npm-side prerequisites + post-merge "cut 2.0.0" steps.

## Quality gates

- [ ] `pnpm build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] `npx tsc --noEmit` (typecheck) passes
- [ ] `npm run lint` passes
- [ ] Workflow YAML valid (`actionlint` clean if available)

## Verification

- [ ] release-please config inspected/dry-run confirms bare `v*` tag output.
- [ ] `release-publish.yml` shows `id-token: write`, `contents: read`, `--provenance`, and no token secret.
- [ ] `packages/taskflow/CHANGELOG.md` contains `## [2.0.0]` with a Breaking Changes subsection; root changelog is a pointer.
