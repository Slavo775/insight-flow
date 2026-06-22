# N168 — Split task-git out of enforcement module into its own handover-able module

**Type:** rework
**Priority:** medium
**Created:** 2026-06-22

## Problem

Git/PR responsibilities are bundled inside the `enforcement` module, so any agent that pulls `enforcement` implicitly gets git behaviour. The user wants task-git to be its own module that an agent explicitly references and hands over to — git should be a distinct, opt-in concern.

## Goal

1. Extract git/PR responsibilities into a standalone `task-git` module.
2. `enforcement` no longer implies git behaviour.
3. Agents reference task-git explicitly and can hand over to it within a flow.
4. Existing agents that relied on enforcement-implied git keep working via a migration.

## Scope

### In scope

- Locate enforcement git rules (likely `AGENT_ENFORCEMENT.md`, the module registry, and/or `packages/taskflow/templates/roles/`) and extract them.
- Define a `task-git` module (canonical `TASK_GIT_ROLE.md` already exists — wire it as a composable module).
- Update role-template sync (`packages/taskflow/scripts/sync-role-templates.mjs`) if templates change.
- Migration for agents whose `modules[]` relied on enforcement-git.

### Out of scope

- The handover mechanics themselves if they depend on N166 (coordinate, don't duplicate).
- Changing git command content (it stays technology-agnostic / user-supplied via agents.extend).

## Implementation plan

1. **Locate** — find where enforcement currently carries git/PR rules across docs, registry, and templates.
2. **Extract** — move those rules into a `task-git` module definition; remove them from `enforcement`.
3. **Reference model** — make agents list `task-git` explicitly in `modules[]` and support handover-to-task-git.
4. **Migration** — for existing agents that pulled `enforcement` for git, add task-git (or document the upgrade) so behaviour is preserved.
5. **Sync templates** — run/adjust `sync-role-templates.mjs` so `templates/roles/` matches.

## Verification

- `pnpm --dir packages/taskflow test` passes; role-template sync check is clean.
- Manual: an agent without `task-git` no longer performs git steps via enforcement; adding `task-git` restores them; handover to task-git works in a flow.

## Notes

- is-test agents (e.g. `taskmaster-whats-new.json`) list `enforcement` in `modules[]`. Technology-agnosticism must hold (no shipped git-host defaults). See ANALYSIS.md. Related: N166 (handover model). Parallel-safe with N162/N163.
