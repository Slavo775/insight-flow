# N12 — Custom agent rules and extensions via project config — Review

**Reviewer:** Task Reviewer (AI)
**PR:** No PR URL recorded yet — reviewed from local diff `main...feat/N12-custom-agent-rules-and-extensions-via-project-config`
**Verdict:** APPROVED (round 2 — post non-blocking fixes)

---

## Summary

657 insertions across 10 files. Risk: **low**.

- New optional `agents` field on `TaskflowConfig` with clean type hierarchy (`AgentsConfig`, `AgentExtensions`, `CustomAgent`).
- `initProject` reads the existing config on re-init (was ignoring it before), then applies `agents.extend` and `agents.custom`.
- `applyAgentExtensions` uses HTML comment markers (`<!-- taskflow:extensions:start/end -->`) for idempotent replace — solid pattern.
- `generateCustomAgentSkills` writes `.claude/commands/<name>.md` with `@AGENT_ENFORCEMENT.md` reference and optional output contract.
- `generateClaudeMd` extended to append custom agent rows to the skills table.
- JSON Schema covers all config fields with `additionalProperties: false` and enum validation for built-in agent names.
- 5-test integration suite using `node:test` (no new dependencies) covers all required scenarios.

---

## Checklist verification

- [x] `taskflow.config.json` schema defined and documented (`schema/taskflow.config.schema.json`)
- [x] `insight-flow init` reads config from `process.cwd()` when present
- [x] `agents.extend` rules appended under `## Project Extensions`
- [x] Re-running `init` replaces (not duplicates) the section — verified by test 3
- [x] `agents.custom` entries produce skill files — written to `.claude/commands/` (see note below)
- [x] Custom agent skill files include `@AGENT_ENFORCEMENT.md` reference
- [x] Custom agents listed in CLAUDE.md skills section (as table rows)
- [x] `init` without config = no regression — verified by test 1
- [x] Test fixture `packages/taskflow/test/fixtures/taskflow.config.json` added
- [x] Integration test passes — 5/5
- [x] `README.md` updated with `## Customizing agents` section and schema table

## Quality gate results

- `npx tsc --noEmit` — ✓
- `pnpm format` — ✓ (ran during implementation)
- Integration tests — 5/5 ✓

---

## Non-blocking

### 1 — Spec path discrepancy (TASK.md says `.claude/skills/`, code uses `.claude/commands/`)

TASK.md and CHECKLIST say custom agents go to `.claude/skills/<name>.md`. The implementation correctly uses `.claude/commands/<name>.md`, which is where Claude Code looks for slash commands. The spec was wrong; the code is right. The README and tests both document `commands/` consistently.

**Suggested follow-up:** Update the CHECKLIST wording to reflect `commands/` so future readers aren't confused. Not a code change.

### 2 — `generateCustomAgentSkills` always overwrites custom skill files

Built-in skills skip writing if the file already exists (`!existsSync`). Custom skills always overwrite. This is intentional (config-authoritative per Goal #4) but means a user who edits a generated custom skill manually will have those changes stomped on `insight-flow init`. Consider adding a `force` guard in a future task if this becomes a pain point.

### 3 — No path sanitization for `custom[].name`

`resolve(commandsDir, \`${agent.name}.md\`)` uses the `name` value directly. A value like `../../.bashrc` would resolve outside `commandsDir`. In practice this is user-controlled config in their own project, so exploitation is self-inflicted, but a `basename(agent.name)` guard would be more defensive.

### 4 — Silent skip when role file doesn't exist for `agents.extend`

`if (!existsSync(filePath)) continue` silently ignores a missing role file. A user targeting `task-implement` before running `insight-flow init` (or with a non-default `rolesDir`) gets no feedback. A `console.warn` matching the unknown-agent warning would be consistent.

---

## Round 2 — Post non-blocking fixes (commit 456c5f9)

All three actionable non-blocking items from round 1 have been addressed:

- **#1 (CHECKLIST path)** — Both `.claude/skills/` references updated to `.claude/commands/`. ✓
- **#3 (basename guard)** — `basename(agent.name)` applied before `resolve()`. Path traversal blocked. Minor: `console.log` still uses raw `agent.name` for the display message — harmless. ✓
- **#4 (console.warn)** — Now logs agent name + full file path when role file is missing. ✓
- **#2 (always overwrites)** — Intentionally not changed; by design per Goal #4.

**Verdict: APPROVED** — ready to merge.

---

## Notes

- Config re-read via shallow spread (`{ ...config, ...onDisk }`) is an improvement over the prior behavior (hardcoded defaults ignored disk), though it doesn't deep-merge `server`/`activityEngine` like `resolveConfig` does. Pre-existing inconsistency, out of scope for this task.
- `AgentsConfig` is imported in `init/index.ts` but not used as a standalone type annotation — only accessed via `config.agents`. Harmless since `no-unused-vars` is disabled.
