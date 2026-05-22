# N12 — Custom agent rules and extensions via project config

**Type:** feat
**Priority:** medium
**Created:** 2026-05-21

## Problem

- The built-in agent roles (implementer, reviewer, etc.) are generic. Projects need a way to inject project-specific rules, extra constraints, or entirely custom agents without modifying the shared `TASK_*_ROLE.md` files.

## Goal

1. Define a config file format (e.g., `taskflow.config.json`) where the user can declare per-agent rule extensions and custom agents.
2. `insight-flow init` reads the config and merges user-defined rules into the generated `TASK_*_ROLE.md` (or generates new skill files for custom agents).
3. Custom agents behave identically to built-in agents: they get a Claude Code skill (`/<agent-name>`) and are listed in CLAUDE.md.
4. Existing generated files are re-generated (not hand-patched) on each `init` run so config stays authoritative.
5. A clear documented schema for `taskflow.config.json` so users know what keys are valid.

## Scope

### In scope

- `taskflow.config.json` schema: `agents` object with `extend` (per-built-in-agent extra rules) and `custom` (new agent definitions).
- `insight-flow init` logic in `packages/taskflow/src/commands/init.ts` (or equivalent) to read the config and merge/generate role files.
- Generation of `.claude/skills/<agent>.md` for custom agents and injection of `/<agent>` into CLAUDE.md skills list.
- Merging `extend` rules into the bottom of the relevant built-in role file under a clearly marked `## Project Extensions` section.
- Documentation: update `packages/taskflow/README.md` with the config schema.

### Out of scope

- Runtime prompt injection (changes are file-based only).
- GUI config editor.
- Overriding core role contracts (INPUT/OUTPUT CONTRACT sections stay intact).
- Changing how existing tasks or the tracker work.

## Implementation plan

1. **Define config schema** (`taskflow.config.json` at project root)
   - Top-level key: `"agents"` → object
   - `agents.extend`: `{ "task-implement": ["rule 1", "rule 2"], "task-review": ["..."] }` — arrays of extra rule strings per built-in agent name.
   - `agents.custom`: array of `{ name, role, description, outputContract }` objects for brand-new agents.
   - Add JSON schema file at `packages/taskflow/schemas/taskflow.config.schema.json`.

2. **Load config in `init` command** (`packages/taskflow/src/commands/init.ts`)
   - After writing base role files, check if `taskflow.config.json` exists in the project root (`process.cwd()`).
   - Parse and validate against the schema (use `ajv` or simple manual validation).
   - Pass parsed config to the role-file generator.

3. **Merge `extend` rules into built-in role files**
   - For each agent name in `agents.extend`, find the corresponding generated `TASK_*_ROLE.md` (mapping: `"task-implement"` → `TASK_IMPLEMENTER_ROLE.md`, etc.).
   - Append a `## Project Extensions` section with the list items. If the section already exists, replace it.
   - Do NOT touch any section above the `---` project-extension marker.

4. **Generate skill files for `custom` agents**
   - For each entry in `agents.custom`, write `.claude/skills/<name>.md` using the provided `role`, `description`, and `outputContract` fields.
   - Template: fill in `ROLE:`, `## Description`, `## Output Contract` headings.

5. **Register custom agents in CLAUDE.md**
   - In the generated CLAUDE.md skills list, append each custom agent as `- <name>: @<name>.md`.
   - On re-init, diff the list and add only missing entries.

6. **Tests / manual verification**
   - Add a fixture `taskflow.config.json` under `packages/taskflow/test/fixtures/` with at least one `extend` and one `custom` entry.
   - Update/add integration test that runs `init` with the fixture config and asserts the output files contain expected strings.

7. **README update**
   - Add `## Customizing agents` section to `packages/taskflow/README.md` with the full config schema and a worked example.

## Verification

- Run `insight-flow init` with a `taskflow.config.json` present → `TASK_IMPLEMENTER_ROLE.md` contains `## Project Extensions` with the configured rules.
- Run `insight-flow init` without config → no `## Project Extensions` section, no regression.
- Custom agent `name: "deploy-check"` → `.claude/skills/deploy-check.md` exists and CLAUDE.md lists `/deploy-check`.
- Re-running `init` twice is idempotent (no duplicate sections).
- `npx tsc --noEmit` passes in `packages/taskflow/`.

## Notes

- Built-in agent name → file mapping to maintain: `task-implement` → `TASK_IMPLEMENTER_ROLE.md`, `task-review` → `TASK_REVIEWER_ROLE.md`, `task-review-fix` → `TASK_REVIEW_FIXER_ROLE.md`, `task-git` → `TASK_GIT_ROLE.md`, `taskmaster` → `TASKMASTER_ROLE.md`.
- Related: N09 (taskflow init), N11 (agent enforcement).
- `AGENT_ENFORCEMENT.md` is referenced via `@AGENT_ENFORCEMENT.md` in all role files — custom agents should include the same reference.
