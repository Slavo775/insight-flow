# N97 — Onboard task-git into the composer, registry, and project flow

**Type:** rework
**Priority:** medium
**Created:** 2026-06-11

## Problem

- task-git is the only role with no role file: its entire ~176-line prompt is inline in `.claude/commands/task-git.md` (every other command is a 3-line `@ROLE_FILE.md` pointer). Consequences: never part of N90's migration, absent from `COMPOSED_AGENTS`, invisible on the N93 agents page and in N96's project flow — the push/PR/merge backbone of the lifecycle doesn't appear on the map. `AGENT_ROLE_FILE_MAP` already points `task-git → TASK_GIT_ROLE.md` at a file that doesn't exist, so the documented `agents.extend.task-git` injection silently no-ops in consumers.

## Goal

1. task-git is a composed agent: `task-git/*` section modules + new shared include modules `notify` (`@AGENT_NOTIFY.md`) and `config` (`@AGENT_CONFIG.md`) + the `actions` module; "the 9" become **"the 10"**.
2. `TASK_GIT_ROLE.md` generated at repo root by compose-apply, drift-guarded; templates + init ship it; `.claude/commands/task-git.md` shrinks to the standard 3-line pointer.
3. `project/default.json` gains the `task-git` node + honest flow edges (push/review/merge backbone) with valid status triggers.
4. Fidelity rule (as N90): decompose the existing prompt text **as-is** — onboarding, not rewording.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/notify.json`, `modules/config.json` (new include modules) + descriptions.
- `packages/taskflow/src/agents/modules/roles/task-git.json` (new) — decomposed from `.claude/commands/task-git.md` (identity, INPUT CONTRACT, CONVENTIONS, PERMISSION GATES, the three WORKFLOW sections, EDGE CASES, SAFETY, TOKEN EFFICIENCY, EXAMPLES APPENDIX — split on the file's actual headings; `---` separators stay inside bodies).
- `packages/taskflow/src/agents/composed/task-git.json` — ordered def: identity, notify, config, …sections…, actions; registered in `COMPOSED_AGENTS` (compose.ts imports).
- `TASK_GIT_ROLE.md` (repo root) — generated only via `prompt-build --compose --apply`.
- `.claude/commands/task-git.md` — replaced by `@TASK_GIT_ROLE.md` + `$ARGUMENTS` pointer.
- `packages/taskflow/scripts/sync-role-templates.mjs` — add TASK_GIT_ROLE.md; templates dir gains it; init scaffolds it (template-driven, automatic).
- `packages/taskflow/src/cli/commands/prompt-build.ts` — add TASK_GIT_ROLE.md to its `ROLE_FILES` enforcement-patch list if appropriate (it contains `@AGENT_ENFORCEMENT.md`? task-git's prompt does NOT include enforcement/protocol — keep faithful: do not add includes that weren't there; patcher list only if the generated file needs enforcement patching — it doesn't).
- `packages/taskflow/src/agents/project/default.json` — agents += task-git; flow edges reworked to route through it: `task-implement → task-git` (on `implemented`), `task-git → task-review` (on `pushed`), `task-human-review → task-git` (on `approved`), `task-request-changes`/fix loops unchanged; task-git is the merge/done terminal.
- Tests: `compose.test.mjs` ROLE_FILES map gains task-git (drift suite ×10); registry/agents-list assertions 9→10; project flow tests updated; N93 `/api/agents` picks it up automatically.

### Out of scope

- Any rewording/restructuring of the task-git prompt content (byte-faithful decomposition; the only allowed additions are the `actions` block — its events note already says standalone task-git uses start/done — and nothing else).
- Adding enforcement/protocol includes task-git never had.
- Workflow/behavior changes to git operations; dashboard changes beyond what registry data implies.

## Implementation plan

1. **Decompose** — extend the N90 decompose approach to `.claude/commands/task-git.md` (strip the trailing `$ARGUMENTS` and leading includes; includes become the new `notify`/`config` modules). Round-trip-verify: composed output byte-matches the source text with the includes region + appended actions block being the only deltas.
2. **Register** — modules/roles/task-git.json + composed/task-git.json; compose.ts imports; AgentsPage/ModulesPage pick it up via the registry.
3. **Generate + repoint** — compose-apply writes `TASK_GIT_ROLE.md`; command file becomes the 3-line pointer; sync templates; verify init scaffolds it (smoke test).
4. **Project flow** — default.json: add node + edges per Goal 3; flow tests updated.
5. **Gates** — build, full suite (drift ×10), lint; playground `/agent/task-git` + `/project` show the node.

## Verification

- Drift test: `composeAgentById("task-git")` === committed `TASK_GIT_ROLE.md`; all 10 in the suite.
- `.claude/commands/task-git.md` is 3 lines; invoking `/task-git` still loads the full role (via the include).
- `/api/agents` lists 10; `/project` flow shows implement → git → review and the approved → git terminal.
- Fresh-init smoke: TASK_GIT_ROLE.md scaffolded; `agents.extend.task-git` injection now lands in a real file.

## Notes

- Found by the human browsing the new dashboard — exactly the visibility the N93/N96 surfaces were built to create.
- The two new include modules (`notify`, `config`) are the first real users of those partials in the registry — sync-role-templates already ships AGENT_NOTIFY? (it ships PROTOCOL/SECURITY; NOTIFY/CONFIG ship via init templates — verify both exist in templates/roles and add to the sync list if they're root-canonical).
- Stacked: implement after N96 (#73); tracker lineage via this branch chain.
