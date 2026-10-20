# N275 — Consumer prompts carry the real roles — @-include built-in commands, Cursor include inlining, one name per agent

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

Users' agents run weaker prompts than this repo's agents:

- `insight-flow init` writes ~10-line stub slash commands (378–574 B in `playground/`) instead of `@TASK_*_ROLE.md` + `$ARGUMENTS`. `AGENT_SECURITY`, the git-permission rules, handovers and `agents.extend` never reach the agent, and `/task-git` always pushes.
- The stubs are write-if-missing, so they never refresh.
- For Cursor, `toCursorBody` deletes every `@include` line instead of inlining it, so Cursor skills have zero security guardrails.
- Every composed agent with subagents gets two contradictory orders ("No subagents" vs "You can delegate").
- A custom agent gets two different slash commands (`/foo` from init, `/task-foo` from install).
- Custom flows never emit `.cursor` skills.

Source: `N271/AUDIT.md` **A16, A17, A19, A49, A80** (agents.custom + template sync).

## Goal

1. Every built-in slash command written by `init` is `@.claude/roles/<ROLE>.md` + `$ARGUMENTS`, the same as this repo's own `.claude/commands/`.
2. Cursor skill bodies contain the full text of every included file, including the security block.
3. No composed prompt contains contradictory subagent instructions.
4. A custom agent has exactly one command name (`deriveCommandName`), and custom flows emit Cursor skills when Cursor is in use.
5. A test fails if `templates/roles/*` drift from the root role files.

## Scope

### In scope

- `packages/taskflow/src/agents/init/providers/skills.ts` — `SKILL_*` constants (~:15-178), `agents.custom` bodies (~:219-237), `composerAgentSkills` (~:265-281), `toCursorBody` (~:288-301).
- `packages/taskflow/src/agents/init/providers/claude.ts` (:27) and `init/index.ts` — command writing and refresh.
- `packages/taskflow/src/agents/emit.ts` — `applyCommands`: add a Cursor target.
- `packages/taskflow/src/agents/flow-install.ts` — the Cursor target in install plans.
- `packages/taskflow/src/agents/compose.ts` (~:482-505) and the module JSON that produces `AGENT_ENFORCEMENT.md` (`src/agents/modules/…`). Re-compose the root `*_ROLE.md` files and run `scripts/sync-role-templates.mjs`.
- Tests.

### Out of scope

- Hook scripts → N280.
- Install conflicts with unmanaged files → N281. Here, only avoid clobbering a command the user edited (see step 1).
- Prompt wording beyond removing the contradiction.

### Locked decision (from N271 — do not re-ask)

- Built-in commands in user projects **`@`-include the full role files** (`@.claude/roles/<ROLE>.md` + `$ARGUMENTS`). The `SKILL_*` summaries are removed.

## Implementation plan

1. **Built-in commands (A16).** Replace the `SKILL_*` bodies with `@.claude/roles/<ROLE_FILE>\n\n$ARGUMENTS`, mirroring `.claude/commands/task-implement.md` in this repo. Confirm `init` writes every referenced role file (and generated `AGENT_ENFORCEMENT.md` / `AGENT_GIT.md`) into `.claude/roles/`. Refresh rule on re-init: overwrite a command only when it is missing, equals a known old stub (keep a list of stub hashes), or is unchanged since insight-flow wrote it. Never overwrite a file the user edited; print a notice instead. Delete the `SKILL_*` constants.
2. **Cursor inlining (A17).** In `toCursorBody`, replace each `@<ref>` line with the referenced file's content: the generated file in the roles dir when it exists, else `resolvePackageAsset("templates/roles/<ref>")`. Recurse once for nested includes. Assert the output contains "PROMPT INJECTION".
3. **Contradiction (A19).** Drop "No subagents. Direct tool calls only." from the shared enforcement block (keep it only in the token-efficiency guidance for agents without `subagents`), or have `subagentSection` emit an explicit override sentence. Make the edit in the module JSON source, then re-compose. The `compose.test` drift guards must stay green, with root `*_ROLE.md` and `AGENT_ENFORCEMENT.md` regenerated.
4. **One command name (A49).** Use `deriveCommandName(a.id)` in `composerAgentSkills` (`skills.ts:276`).
5. **Cursor target for custom flows (A49).** When the project uses Cursor (`.cursor/` exists or config editor includes cursor), `applyCommands` also emits `.cursor/skills/<name>/SKILL.md` (`toCursorBody` + frontmatter). Record it in the manifest so uninstall removes it.
6. **`agents.custom` (A80).** Emit the security / enforcement / protocol trio, as composed agents do.
7. **Template drift test (A80).** New test: for each file in `ROLE_FILES`, `templates/roles/<f>` equals the root `<f>` byte for byte.
8. **Tests.** `init` in a temp dir writes `@`-include commands; re-init upgrades an old stub but keeps a user-edited command; `--editor cursor` skill contains the security text; a custom agent produces one command name; a custom-flow install in a Cursor project writes `.cursor/skills/…` and uninstall removes it.

## Verification

- `pnpm --dir packages/taskflow test` is green, including `compose`, `init`, `cursor-provider`, `agent-command`, `no-technology-tight` and the new tests.
- Manual: run `insight-flow init --yes` in `playground/` → `.claude/commands/task-implement.md` contains `@.claude/roles/TASK_IMPLEMENTER_ROLE.md` and `$ARGUMENTS`; `/task-git` text comes from the role file and respects `agents.git.permissions`.
- `grep -c "PROMPT INJECTION" <cursor skill dir>/task-review/SKILL.md` → ≥ 1.

## Notes

- Detail and evidence: `N271/AUDIT.md` A16, A17, A19, A49, A80. Composer custom agents already get the full composed prompt (`skills.ts:265-281`); only built-ins and the Cursor path are broken.
- Keep the technology-agnostic rule: no package-manager or git-host commands in shipped prompts (`no-technology-tight.test.mjs`).
- No dependency; can start now. N281 (install conflicts) runs after this task.
- Recommended run: `/task-analyze N275` → `/task-implement N275`.
