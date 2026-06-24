# N175 — Automated release pipeline (release-please + OIDC npm publish) + public-repo hardening, then cut v2.0.0

**Type:** feat
**Priority:** high
**Created:** 2026-06-23

## Problem

- All releases to date (N13 → N80 GA) have been **manual**: human bumps version, hand-writes CHANGELOG, then runs `npm publish` + `git tag` + `gh release create`. There is **no `.github/workflows/`** at all.
- Both `CHANGELOG.md` (root) and `packages/taskflow/CHANGELOG.md` are currently **0 bytes** — the `[1.0.0]` entry has been lost and the two changelogs have already drifted.
- The repo is **public** (`Slavo775/insight-flow`), so the publish pipeline must be designed for a public repo (no leakable token, tag/release-only triggers, least privilege).
- Published is `insight-flow@1.0.0`; the next release is a **major 2.0.0** because the module/agent composition v2 work (N89) is breaking for consumers.

## Goal

1. `release-please` workflow maintains a Release PR (auto CHANGELOG + version bump from conventional commits), keeping the existing bare `v*` tag format.
2. `release-publish.yml` publishes to npm via **OIDC Trusted Publishing** (no `NPM_TOKEN`, provenance on), triggered **only** on `release: published`.
3. Changelogs consolidated to `packages/taskflow/CHANGELOG.md` (single source of truth); root `CHANGELOG.md` becomes a pointer.
4. Public-repo hardening: least-privilege `permissions`, SHA-pinned actions, tag/release-only triggers, one-time git-history secret scan.
5. Pipeline lands and merges **first**; cutting v2.0.0 through it is a post-merge human step (out of scope for code changes here).

## Scope

### In scope

- **`.github/workflows/release-please.yml`** (new) — runs on `push` to `main`; uses release-please (release-type `node`, package path `packages/taskflow`) to maintain a Release PR. Tag format pinned to bare `v${version}` (no package prefix) to match existing tags. `permissions: contents: write` + `pull-requests: write` scoped to this workflow only.
- **`.github/workflows/release-publish.yml`** (new) — `on: release: { types: [published] }` **only** (never `pull_request`). Job: checkout → `actions/setup-node` (Node 20+, recent npm supporting OIDC) → `pnpm build` → `pnpm pack:taskflow` dry-run check → `npm publish --provenance --access public` from `packages/taskflow` using OIDC. `permissions: contents: read`, `id-token: write`. Optional `environment: npm-publish` for a manual-approval gate.
- **release-please config** — `release-please-config.json` + `.release-please-manifest.json` at repo root (manifest mode, single package `packages/taskflow`, current version seeded to `1.0.0`, `changelog-path` → `packages/taskflow/CHANGELOG.md`).
- **`packages/taskflow/CHANGELOG.md`** — seed a fresh `## [2.0.0]` entry with a **Breaking Changes / Migration** section for module/agent composition v2 (N89) + an `## [Unreleased]` header above it. **No N81–N174 backfill.**
- **`CHANGELOG.md`** (root) — reduce to a one-line pointer to `packages/taskflow/CHANGELOG.md`.
- **Action pinning** — all third-party actions pinned to a commit SHA (with a `# vX.Y.Z` comment); top-level `permissions: contents: read` default in both workflows.
- **One-time secret scan** — run a git-history scan (e.g. `gitleaks detect` or `git log -p` grep for keys/tokens) and record the result in the PR description / Notes.

### Out of scope

- **Actually publishing v2.0.0** — done post-merge by the human via the new pipeline (merge the Release PR → release fires → publish).
- **npm-side OIDC registration** — manual human prerequisite (documented in Notes); cannot be done in code.
- **Backfilling GitHub releases** for v0.x.
- **Removing/renaming any CLI surface** — no feature/behavior changes to the binary.
- **Changing the actual module composition v2 code** — already shipped; this task only documents the breaking change in the changelog.

## Implementation plan

1. **release-please config** — add `release-please-config.json` (packages: `{ "packages/taskflow": { "release-type": "node", "changelog-path": "CHANGELOG.md", "tag-separator": "-", "include-component-in-tag": false } }`) and `.release-please-manifest.json` (`{ "packages/taskflow": "1.0.0" }`). Confirm tag output is bare `v1.0.1`-style, no `insight-flow-` prefix.
2. **`release-please.yml`** — `on: push: branches: [main]`; single job using the official release-please action (SHA-pinned); `permissions: { contents: write, pull-requests: write }`.
3. **`release-publish.yml`** — `on: release: { types: [published] }`; `permissions: { contents: read, id-token: write }`; steps: checkout (SHA-pinned), setup-node (SHA-pinned, `registry-url`), corepack/pnpm, `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm pack:taskflow` sanity check (LICENSE present), `npm publish --provenance --access public` in `packages/taskflow`. Add `environment: npm-publish`.
4. **Changelog consolidation** — write fresh `## [2.0.0] — <date>` into `packages/taskflow/CHANGELOG.md` with **Breaking Changes** (module/agent composition v2, N89 — what changed, how consumers migrate) + a short Added/Changed summary; add empty `## [Unreleased]`. Replace root `CHANGELOG.md` with a pointer line.
5. **Hardening pass** — verify both workflows: tag/release-only triggers, SHA-pinned actions, least-privilege `permissions`, no `pull_request_target`. Run the git-history secret scan; record findings.
6. **PR** — via `/task-git`: branch `feat/N175-release-pipeline`, push, open PR. PR body lists the manual npm-side prerequisites and the post-merge "cut 2.0.0" steps.

## Verification

- `pnpm build` succeeds; `pnpm --dir packages/taskflow test` passes.
- Workflow files validate (YAML lints / `actionlint` clean if available); each third-party action is SHA-pinned.
- `release-please.yml` has no `pull_request*` trigger; `release-publish.yml` triggers only on `release: published` and declares `id-token: write` + `contents: read`.
- `release-please-config.json` produces bare `v*` tags (no package prefix) — confirm via release-please dry-run or config inspection.
- `packages/taskflow/CHANGELOG.md` has a `## [2.0.0]` section with a Breaking Changes / Migration subsection; root `CHANGELOG.md` is a pointer.
- `npm publish` step uses `--provenance` and no `NODE_AUTH_TOKEN`/`NPM_TOKEN` secret.
- git-history secret scan completed; result recorded in PR.

## Notes

- **From `/task-analyze` (ANALYSIS.md):** Path A (release-please, human-gated via merging the Release PR) chosen over fully-automatic semantic-release to preserve deliberate version milestones; OIDC Trusted Publishing chosen over a stored token. Pipeline first, then exercise it on the real 2.0.0.
- **Manual human prerequisites (npm side — out of scope, document in PR):**
  1. On npmjs.com → `insight-flow` package → **Settings → Trusted Publishing** → add GitHub Actions publisher: repo `Slavo775/insight-flow`, workflow `release-publish.yml`, environment `npm-publish`.
  2. GitHub → **Settings → Environments → `npm-publish`** → add self as required reviewer (manual approval gate).
  3. GitHub → **Settings → Code security** → enable Secret scanning, Push protection, Dependabot alerts.
- **Why 2.0.0:** module/agent composition v2 (N89, "everything is a module") is breaking for consumers — justifies the major bump 1.0.0 → 2.0.0.
- Related: N80 (1.0.0 GA, the manual release pattern this replaces); N89 (module composition v2 — the breaking change).
