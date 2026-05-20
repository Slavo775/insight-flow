# N05 — Migrate role files to insight-flow binary and delete scripts/task-tracker.mjs

**Type:** rework
**Priority:** high
**Created:** 2026-05-20

## Problem
The repo has two CLIs that do the same thing: `scripts/task-tracker.mjs` (legacy) and `packages/taskflow/src/cli.ts` (published as `insight-flow`). Every `TASK_*_ROLE.md` file still instructs agents to call `node scripts/task-tracker.mjs ...`. Per the project review (REVIEW_ANALYSIS.md, Phase 1.1), the legacy script must go and roles must use the package binary.

## Goal
1. Every `TASK_*_ROLE.md` and `TASKMASTER*_ROLE.md` calls `insight-flow <cmd>` instead of `node scripts/task-tracker.mjs <cmd>`.
2. `scripts/task-tracker.mjs` is deleted from the repo.
3. `CLAUDE.md` and any other docs no longer reference the legacy script.
4. Running existing taskflow commands (`current`, `next`, `create`, `status`, `implement-start/end`, etc.) via `insight-flow` works identically to the old script.

## Scope
### In scope
- `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASKMASTER_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md`.
- `scripts/task-tracker.mjs` — delete.
- `CLAUDE.md` — update any reference to the legacy script.
- Any `.claude/commands/*.md` or skill files that still mention `scripts/task-tracker.mjs`.

### Out of scope
- Changing the CLI surface (verbs, flags, output shape) — pure invocation swap.
- Refactoring path resolution inside the binary (covered by N10).
- Moving role definitions into the package (covered by N08).
- Zod validation (covered by N07).

## Implementation plan
1. **Audit references**
   - `grep -rn "scripts/task-tracker.mjs" .` and `grep -rn "task-tracker.mjs" .` (excluding `node_modules`, `.git`, `dist`).
   - List every file that needs updating; expect ~8 role files + CLAUDE.md + possibly skill/command files.
2. **Verify CLI parity**
   - Ensure `insight-flow` exposes the same commands the role files use today (`current`, `next`, `next-review`, `next-fix`, `next-change`, `create`, `status`, `implement-start`, `implement-end`, `review-start`, `review-end`, `fix-start`, `fix-end`, `push`, `mr-update`, `merge`, `done`, `stats`, `list`, `change-request`, `change-start`, `change-end`, `incident-*`, `migrate`).
   - If any command is missing on the package side, flag it (do not silently drop it) — fixing parity gaps is in this task's scope.
3. **Update each role file**
   - Replace `node scripts/task-tracker.mjs <cmd>` with `insight-flow <cmd>` (preserve all flags and arguments verbatim).
   - Update any prose that says "the task tracker script" to reference "the `insight-flow` CLI".
4. **Update `CLAUDE.md`**
   - The "Scripts" section currently lists `scripts/task-tracker.mjs` — replace with a pointer to the `insight-flow` binary and `packages/taskflow`.
5. **Delete the legacy script**
   - `git rm scripts/task-tracker.mjs`.
   - Verify `scripts/` still contains `build-taskflow-ui.mjs` (do not delete that — N09 handles it).
6. **Smoke test the new flow**
   - From repo root: `insight-flow current`, `insight-flow next`, `insight-flow stats`, `insight-flow list`. All must return the same data the old script returned.
   - Confirm no role file or doc still contains the string `task-tracker.mjs` (except in CHANGELOG/git history).

## Verification
- `grep -rn "task-tracker.mjs" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` returns zero matches.
- `ls scripts/task-tracker.mjs` errors (file removed).
- `insight-flow current` prints the current task identically to what `node scripts/task-tracker.mjs current` printed before this task.
- `insight-flow stats` runs without error.
- `npx tsc --noEmit` and `pnpm lint` still pass.

## Notes
- Source: `REVIEW_ANALYSIS.md` § 5 Phase 1.1 ("Bridge Burning").
- Pairs with [[N06]] (centralize CLI logic sweep) — N05 is the role-file/script delete; N06 is the wider repo sweep to ensure the package is the single source of truth.
- The local `insight-flow` binary resolves via the `packages/taskflow` workspace link; make sure it is built (`pnpm --filter insight-flow build:cli`) before running smoke tests.
- Do NOT change CLI behavior in this task; if you find a parity bug, file a separate task or note it in the PR description.
