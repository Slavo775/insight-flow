# N80 — Release insight-flow 1.0.0 (GA)

**Type:** feat
**Priority:** high
**Created:** 2026-06-02

## Problem

- The current published version is `0.13.0`, but **29 commits (N74–N79)** have merged since with no `CHANGELOG` entry — the `[Unreleased]` section in both changelogs is empty.
- A public `1.0.0` GA is blocked by a **missing top-level `LICENSE` file**, even though `packages/taskflow/package.json` lists `"LICENSE"` in `files` and the README links to it.
- Docs drift: `packages/taskflow/README.md` still headers "What's new in 0.13.0". This task takes the project to an intentional `1.0.0` GA — a deliberate "the CLI surface is stable" milestone, not a semver-forced bump.

## Goal

1. Ship a `LICENSE` file (MIT) and confirm `package.json` `license` is `"MIT"`.
2. Record a complete `[1.0.0]` CHANGELOG entry in both changelogs covering N74–N79.
3. Bump the publishable package version `0.13.0 → 1.0.0`.
4. Land all of the above in a **single PR that ends ready-to-publish** — green build/tests and a `pnpm pack` dry-run proving `LICENSE` is in the tarball.
5. Leave npm publish / git tag / GitHub release for the human, **after** PR merge.

## Scope

### In scope

- **`LICENSE`** (new, repo root) — MIT, year 2026, author Slavo.
- **`CHANGELOG.md`** (root) + **`packages/taskflow/CHANGELOG.md`** — new `[1.0.0]` section.
- **`packages/taskflow/package.json`** — `version` → `1.0.0`; verify/set `license: "MIT"`.
- **`packages/taskflow/README.md`** — fix the "What's new in 0.13.0" header (~line 7) → `1.0.0`.

### Out of scope

- **Removing the deprecated `batch` aliases** — keep them one more release (decided).
- **Backfilling GitHub releases** for `v0.6`–`v0.13` — single `v1.0.0` release only.
- **`npm publish`, `git tag v1.0.0`, `gh release create`** — all human-driven, **after** this PR is merged.
- Any new features or behavior changes.

## Implementation plan

1. **Add `LICENSE` (MIT)** — create `/LICENSE` at repo root: standard MIT text, `Copyright (c) 2026 Slavo`. Confirm `packages/taskflow/package.json` has `"license": "MIT"` (add if absent).
2. **Write the `[1.0.0]` CHANGELOG entry** — in `CHANGELOG.md` (root) and `packages/taskflow/CHANGELOG.md`, replace the empty `[Unreleased]` with `## [1.0.0] — 2026-06-02`. Group the merged work:
   - **Added:** Cursor editor provider + lifecycle hooks → dashboard, with `cursor` provider badge (N75/N76/N77); permission-required notification parity with Claude (N79).
   - **Changed:** `batch*` → `bulk*` command rename — old names kept as deprecated aliases that warn (N78).
   - **Fixed:** `/task-analyze` consent gate — require explicit go-ahead before creating a task.
   - Add a fresh empty `[Unreleased]` above it.
3. **Bump version** — `packages/taskflow/package.json` `version` `0.13.0` → `1.0.0`.
4. **Fix README header** — `packages/taskflow/README.md` ~line 7 "What's new in 0.13.0" → "What's new in 1.0.0" (update the section body if it references 0.13-only items).
5. **Build + test + pack dry-run** — `pnpm build`, run tests, then `pnpm pack:taskflow` and inspect the tarball contents to confirm `LICENSE` is present.
6. **Open the PR** — via `/task-git`: branch `feat/N80-release-1-0-0-ga`, push, create PR. PR description states the post-merge human steps (tag + npm publish + `gh release create v1.0.0`).

## Verification

- `pnpm build` succeeds and `pnpm --dir packages/taskflow test` passes.
- `npm pkg get version --prefix packages/taskflow` returns `1.0.0`; `license` returns `"MIT"`.
- `pnpm pack:taskflow` produces a tarball; `tar -tzf <tarball> | grep LICENSE` lists the file.
- Both `CHANGELOG.md` files have a `## [1.0.0] — 2026-06-02` section; `[Unreleased]` is present and empty.
- `LICENSE` exists at repo root; `grep -i "What's new in 1.0.0" packages/taskflow/README.md` matches.

## Notes

- **Decisions (from `/task-analyze`):** intentional `1.0.0` GA · MIT · single `v1.0.0` GitHub release · keep deprecated `batch` aliases one more release. Full rationale in `ANALYSIS.md`.
- **Release boundary:** this task stops at an open, green PR. Human does: merge → `git tag v1.0.0` → `npm publish` (from `packages/taskflow`, `publishConfig.access: public`) → `gh release create v1.0.0`.
- **Heads-up:** GitHub's latest published release is currently `v0.5.0` — `v0.6`–`v0.13` tags exist but were never released. The new `v1.0.0` release will jump that gap by design.
- Related: N74–N79 (the work being released), N78 (bulk rename + aliases).
