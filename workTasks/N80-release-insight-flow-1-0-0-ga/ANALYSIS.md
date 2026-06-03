# N80 — ANALYSIS (Pre-Taskmaster Strategist audit trail)

**Date:** 2026-06-02
**Origin:** `/task-analyze` → handoff to `/taskmaster`

## Problem framing

The user wants a "1.0.0 prod release" with docs/changelog revised and the GitHub
"latest release" set to `v1.0.0`. Grounding this in the repo showed the request
bundles a documentation audit, a release-readiness analysis, and the release cut
itself — so the real questions were *which version*, *what's actually missing*,
and *where the agent's outward actions should stop*.

## Goal

Cut an intentional `1.0.0` GA: add the missing MIT LICENSE, record the
merged-but-undocumented work (N74–N79) in both CHANGELOGs, bump the package
version, and land it as a single ready-to-publish PR — leaving the irreversible
publish steps to the human after merge.

## Grounded state (verified, not assumed)

- Published version: **0.13.0** (npm + tag `v0.13.0`).
- READMEs are **substantial and current** (root 9.5KB, taskflow 37KB) — they
  already document Cursor support, the `batch→bulk` rename (with a deprecation
  alias note), and permission notifications. (Corrected an early wrong assumption
  that the READMEs were empty — an `ls` artifact.)
- CHANGELOG `[Unreleased]` is **empty** despite **29 commits / N74–N79** merged.
- GitHub Releases: latest published is **v0.5.0**; tags `v0.6`–`v0.13` were never
  released.
- **No `LICENSE` file** exists, though `package.json` `files` lists it and the
  README links to it → hard blocker for a public release.
- `batch→bulk` (N78) shipped **with backward-compat aliases**, so no hard breaking
  change forces a major bump.

## Options considered

1. **Honest 0.14.0 (minor):** ship accumulated work without a stability promise;
   save 1.0.0 for a deliberate "frozen API" milestone. *Rejected by user.*
2. **1.0.0 as intentional GA:** treat this as the public production milestone and
   do the full readiness checklist. *Chosen.*
- Sub-forks: license (MIT vs Apache-2.0 vs later), GitHub release scope (single
  vs backfill v0.6–v0.13), deprecated aliases (remove now vs keep).

## Decision

- **Version:** `1.0.0` (intentional GA).
- **License:** **MIT**.
- **GitHub release:** **single `v1.0.0`** — no backfill of v0.6–v0.13.
- **Deprecated `batch` aliases:** **keep one more release** (not removed at 1.0.0).
- **Shape:** **one task**, ending at an **open green PR**. Human performs merge,
  then `git tag v1.0.0` + `npm publish` + `gh release create v1.0.0`.

## Open questions

- Whether to remove the deprecated `batch` aliases in the *next* release (follow-up
  task), now that they're explicitly retained for 1.0.0.
- Whether to ever backfill the v0.6–v0.13 GitHub releases for a complete history
  (deferred; out of scope here).

## Sources

- `packages/taskflow/package.json` (version 0.13.0, `files` incl. LICENSE,
  `publishConfig.access: public`).
- `CHANGELOG.md` + `packages/taskflow/CHANGELOG.md` (empty `[Unreleased]`).
- `packages/taskflow/README.md` (Cursor + bulk rename documented; "What's new in
  0.13.0" header).
- `git log v0.13.0..HEAD` (29 commits, N74–N79), `git tag`, `gh release list`.

## Handoff brief (as sent to /taskmaster)

> Title: "Release insight-flow 1.0.0 (GA)" · Type: feat · Priority: high · Tags:
> release, docs. Single task ending at an open PR (no publish inside the task):
> add MIT LICENSE; write `[1.0.0]` entry in both CHANGELOGs (N75/N76/N77 Cursor
> provider + hooks + badge, N79 permission parity, N78 bulk rename with aliases,
> task-analyze consent gate); fix README "What's new" header; bump 0.13.0→1.0.0.
> Verify: build + tests green, `pnpm pack:taskflow` includes LICENSE. Out of scope:
> removing batch aliases, backfilling releases, npm publish / tag / gh release
> (human, post-merge).
