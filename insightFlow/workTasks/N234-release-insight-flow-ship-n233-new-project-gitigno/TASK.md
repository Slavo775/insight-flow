# N234 — Release insight-flow — ship N233 (New-project gitignore feature)

**Type:** feat
**Priority:** high
**Created:** 2026-07-14

## Problem

- N233 (the New-project gitignore feature) is approved and verified but **uncommitted** — the 3 source files are working-tree only, with no branch/commit/PR. It cannot be released until it lands as a conventional commit and merges to `main`.
- The Release Check found the docs are **incomplete** for N233 (master hub docs don't mention the new gitignore options or the `hasGit`/`gitIgnore` fields), so this release goes through `changes-needed` → the fixer before it can ship.
- The repo's version state is inconsistent (tag `v2.4.0`, `package.json` 2.4.1, published/global 2.5.0) and should be reconciled so release-please computes the right next version.

## Goal

1. Land N233 on `main` as a `feat(master): …(N233)` conventional commit so release-please records it and bumps the minor version.
2. Close the docs gaps the checker found (hub docs) in a `docs(hub): …` commit.
3. Reconcile the version state so release-please cuts a correct next minor (expected 2.6.0 given 2.5.0 was already published — to confirm).
4. Publish the new version to npm and verify the released tarball/global install carries N233.

## Scope

### In scope

- Committing the N233 source diff (`packages/taskflow/src/master/server.ts`, `client/api.ts`, `client/NewProjectModal.tsx`) as a `feat(master)` commit.
- Docs updates: `website/docs/built-ins/master-server.md` (New-project modal options + `hasGit`/`gitIgnore` endpoint rows) and `website/docs/guides/multi-project-master.md` (step-3 option list).
- release-please version bump + tag + npm publish for the `insight-flow` package.
- Version-state reconciliation (tag / package.json / published mismatch).

### Out of scope

- Any change to the N233 feature behavior (approved as-is across 3 review rounds + human sign-off).
- Manual edits to `packages/taskflow/CHANGELOG.md` (release-please auto-generates it).
- README changes (checker found none needed).
- The pre-existing `FlowEditor.tsx` lint warnings (unrelated to this release).

## Implementation plan

1. **Commit N233 as a feature** — branch `feat/N233-new-project-gitignore`, commit the 3 master source files with message `feat(master): gitignore new-project footprint, shared or local (N233)`. Push and open the PR. (Handled via `/task-git` for N233.)
2. **Close docs gaps** (`/task-release-fix`) — in a `docs(hub): …` commit:
   - `website/docs/built-ins/master-server.md`: add the "Git ignore" choice to the New-project modal options (shown only when the folder is a git repo root; shared vs local; default shared; footprint-ignored-by-default behavior note), and add the `hasGit` field to the `GET /api/fs/list` row and `gitIgnore` to the `POST /api/projects/create` row of the Endpoints table.
   - `website/docs/guides/multi-project-master.md`: add the git-ignore option to the step-3 option list under "Create a new project from the browser".
3. **Reconcile version state** — confirm the correct base: `v2.4.0` tag vs `package.json` 2.4.1 vs published 2.5.0. Determine the next version release-please will compute and ensure `package.json` / tags are consistent so a minor bump lands as expected.
4. **Merge to main** — squash-merge the N233 feature PR (and the docs commit) so release-please sees the `feat`/`docs` commits.
5. **Release-please + publish** (`/task-release-ship`, gated) — let release-please open/merge its release PR (version bump + CHANGELOG), tag, and publish `insight-flow` to npm. Approve the npm-publish deployment env as needed (pin `npm@^11.5.1` for Node 20 — see release memory).
6. **Verify the release** — the published version installs and carries N233 (`gitInfoExcludePath` present; New-project modal shows the gitignore radio).

## Verification

- N233 merged to `main` as a `feat(master)` commit; PR green (tests 353/353, tsc, lint).
- Hub docs updated: `master-server.md` + `multi-project-master.md` reflect the gitignore options and new fields; Docusaurus builds.
- release-please cut a minor bump; `packages/taskflow/CHANGELOG.md` has the N233 "Features" entry (auto).
- `npm view insight-flow version` shows the new version; a fresh global/tarball install contains `gitInfoExcludePath`.

## Notes

- Release Check (N233, status `release-checked`): tests PASS (353/353, tsc clean, lint 0 errors + 2 pre-existing `FlowEditor.tsx` warnings); intent FEATURE → minor; docs incomplete.
- Behavior change for the changelog (not breaking): with git present, the New-project modal now always applies one ignore mode (default shared). Server only writes when the client sends `gitIgnore`, so programmatic callers are unaffected.
- Related: N233 (feature), N232 (prior 2.5.0 release). Release memory: release-please bumps + tags; npm-publish env needs approval; pin `npm@^11.5.1` for Node 20; manual re-publish via workflow_dispatch.
- Routed to `changes-needed` because the checker found doc gaps; the fixer closes them before shipping.
