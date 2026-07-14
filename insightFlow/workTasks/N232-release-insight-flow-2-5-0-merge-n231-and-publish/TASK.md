# N232 — Release insight-flow 2.5.0 — merge N231 and publish

**Type:** chore
**Priority:** high
**Created:** 2026-07-14

## Problem

- N231 (the master overview React-island redesign) is approved with PR **#149** open and mergeable, but not yet on `main`. The last published release is **2.4.1**; `main` already carries N229 (feat) unreleased. We need to merge N231 and cut the next release.

## Goal

1. Merge N231's PR **#149** into `main`.
2. Record N231 `merge` + `done` on `main`.
3. Cut the **2.5.0** release of the `insight-flow` package (release-please bumps the version + changelog from the merged conventional commits; approving/merging the release PR publishes to npm).
4. Verify the published package works (global install / smoke).

## Scope

### In scope

- Merging PR #149 (`feat/N231-master-overview-react-island` → `main`).
- The release mechanics: the release-please release PR (version bump `2.4.1 → 2.5.0`, `packages/taskflow/CHANGELOG.md`), and the npm publish that its merge triggers.
- Post-release bookkeeping: record N231 merge + done; optionally reinstall the global binary.

### Out of scope

- Any source/docs code changes — the release check found **no gaps** (tests 353/353, docs fine). This is a merge + publish task, not a code task.
- The pre-existing N224-era doc staleness the auditor noted (README multi-project section; two "server-rendered HTML" mentions) — separate follow-up, not part of this release.
- Feature work — N229 is already on `main` and rides along in 2.5.0.

## Implementation plan

1. **Merge N231 → main.**
   - Squash-merge PR **#149** (`gh pr merge 149 --squash` or via GitHub). **Human-approved / gated action.**
2. **Sync main + record N231 done.**
   - `git checkout main && git pull`.
   - `insight-flow merge --id N231` then `insight-flow done --id N231` (record on `main` after verifying the merge — do NOT `insight-flow push` for bookkeeping).
3. **Release PR (release-please).**
   - Pushing the merged feat commits to `main` triggers release-please to open/refresh a release PR bumping `packages/taskflow` to **2.5.0** and updating `CHANGELOG.md`. Confirm the PR exists and the version/changelog look right (N229 + N231 features listed).
4. **Publish.**
   - Merging the release-please PR tags `insight-flow@2.5.0` and runs the npm-publish workflow. The publish env needs a deployment approval — approve the pending deployment (`gh api ...pending_deployments`). Watch for the npm@12/Node-20 pin issue (pin `npm@^11.5.1` if publish breaks).
5. **Verify the published release.**
   - `npm view insight-flow version` shows `2.5.0`; optionally `npm install -g insight-flow@2.5.0` and smoke-test `insight-flow master` / `insight-flow ui`.

## Verification

- PR #149 shows `MERGED`; `main` contains the N231 commits.
- N231 status is `done`; N232 is `released` (or `done`).
- `npm view insight-flow version` → `2.5.0`; the release PR's CHANGELOG lists the N229 + N231 features.
- The hub overview (the N231 redesign) loads from the published build.

## Notes

- **Release check summary (custom:task-release-check):** tests **353/353 pass**; intent **MINOR → 2.5.0** (additive features only — no public API / CLI / config / storage-schema break; `overview.ts` deletion is internal); docs **no N231 changes needed** (conventional commit → release-please changelogs it).
- PR: https://github.com/Slavo775/insight-flow/pull/149
- Merge + publish are **irreversible outward actions** — gated on explicit human approval (this is why the flow hands to `task-release-ship` gated, not auto).
- Release mechanics reference: release-please manages the bump/tag; npm-publish workflow needs a deployment approval; `npm@latest` v12 can break Node-20 publish (pin `npm@^11.5.1`); manual re-publish via `workflow_dispatch` if needed.
