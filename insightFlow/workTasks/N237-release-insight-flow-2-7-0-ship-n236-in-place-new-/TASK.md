# N237 — Release insight-flow 2.7.0 — ship N236 (in-place new-project init)

**Type:** feat
**Priority:** high
**Created:** 2026-07-14

## Problem

- N236 (in-place new-project init, PR #153) is approved but the Release Check found
  two gaps that block shipping: (1) an existing test asserts the **old** subfolder
  default and now fails, and (2) the master-hub docs describe the old behavior.
- Both must be fixed before N236 can merge + release as 2.7.0.

## Goal

1. Fix the failing test so the suite is green (update it for the new in-place default,
   keep subfolder coverage via `location:"subfolder"`).
2. Close the blocking doc gaps (master-server.md + multi-project-master.md).
3. Merge N236 (PR #153) to `main` and let release-please cut **2.7.0** (feature/minor).
4. Publish to npm and roll out.

## Scope

### In scope

- Test fix: `packages/taskflow/test/master-liveness.test.mjs` (~line 504-520).
- Docs: `website/docs/built-ins/master-server.md`, `website/docs/guides/multi-project-master.md`.
- Merge PR #153, release-please 2.7.0, npm publish, rollout.

### Out of scope

- The N236 feature code (approved + human-signed-off) — do NOT change behavior; the
  test must be updated to the feature, not the feature reverted.
- READMEs, CHANGELOG (release-please auto-generates it from the `feat` commit).
- The pre-existing FlowEditor lint warnings; the known-flaky master-boot test.

## Implementation plan

1. **Fix the test** (`/task-release-fix` → release-test-fixer). In
   `master-liveness.test.mjs` (test ~504): the create call with no `location` now
   inits **in place** (`dir` = the chosen folder), so assert the project scaffolds in
   the chosen folder itself (not `<chosen>/<slug>`). Add/keep a case that passes
   `location: "subfolder"` and asserts `<chosen>/<slug>`. Keep the "rejects outside
   root" assertion. Root-cause fix (match the new behavior), never weaken the test.
2. **Close docs** (`/task-release-fix` → release-documentation-expert):
   - `master-server.md` "New project — in-app modal": add the init-location choice
     (default "Use the selected folder" / opt-in "Create a new subfolder"); fix the
     gitignore paragraph (in-place ignores only `/insightFlow/` + `/taskflow.config.json`,
     never `.claude/`; `/<slug>/` is subfolder-only); Endpoints table `POST
     /api/projects/create` — add optional `location` field + the 409. Optionally note
     merge-only preservation + conflict reporting.
   - `multi-project-master.md` step 4 — add the init-location step; fix the in-place
     gitignore sentence.
3. **Re-check** (`/task-release-check`) — full suite green, docs complete.
4. **Merge N236** — merge PR #153 to `main` (`/task-release-merge`).
5. **Release + publish** (`/task-release-ship`, gated) — release-please 2.7.0 PR merge
   + npm publish (approve the `npm-publish` env; expect the OIDC auto-chain to fail →
   use the `workflow_dispatch` fallback, per the release memory).
6. **Rollout** (`/task-release-rollout`) — global + bulk-registered projects to 2.7.0.

## Verification

- `pnpm --dir packages/taskflow test` fully green (355/355, incl. the updated N221 test).
- Docs reflect the init-location choice + corrected gitignore + `location` endpoint field.
- N236 merged to `main` as `feat(master)`; release-please cuts 2.7.0; `npm view
  insight-flow version` = 2.7.0; a fresh install shows the in-place default in the modal.

## Notes

- Release Check (N236, `release-checked`): tests FAIL (1 real — `master-liveness.test.mjs:504`),
  intent feature/minor → 2.7.0, docs incomplete.
- The failing test slipped through implementation because the impl review only ran
  `init.test.mjs`, not the full suite — the release check's full-suite run caught it.
- Related: N236 (feature, PR #153), N234 (prior 2.6.0 release), N235 (added the
  release-merge step this flow now uses).
- Routed to `changes-needed` (failing test + doc gaps) → fixer.
