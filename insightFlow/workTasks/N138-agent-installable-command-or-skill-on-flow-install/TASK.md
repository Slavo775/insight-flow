# N138 — Agent-installable command or skill on flow install

**Type:** feat
**Priority:** medium
**Created:** 2026-06-17

## Problem

- A custom agent built in the dashboard never becomes a runnable Claude Code command. Composing/applying an agent emits only its **module** artifacts (`mcp-server` → `.mcp.json`, `hook` → settings, `skill` → `.claude/skills/`); the agent's own composed prompt is written to a command/role file **only for the 10 built-in agents** (the mapping in `prompt-build.ts`). The flow install plan (`flowInstallPlan`) likewise emits only `mcp | hook | skill` steps — there is no `command` step. So a user agent like `custom:test-agent` cannot be invoked as a slash command, even though its MCP/skill modules install fine.

## Goal

1. A composed-agent definition gains an **opt-in flag to install a runnable command/skill** for the agent.
2. The target is **configurable: `command`** (`.claude/commands/*.md`) **or `skill`** (`.claude/skills/<name>/SKILL.md`).
3. The installed name is forced to **`task-<slug>`** (no double-prefix; names colliding with built-in commands are rejected on save).
4. When a flow includes a flagged agent, **flow install emits the command/skill** alongside its other artifacts, tracked in `taskflow-managed.json` for idempotent re-apply + removal.
5. `AgentForm` exposes the flag, target toggle, and a derived-name preview.

## Scope

### In scope

- `core/schema/index.ts` — extend the composed-agent (`ComposedAgent`) schema with an optional command block, e.g. `command?: { install: boolean; as: "command" | "skill" }`.
- `agents/compose.ts` — `AgentArtifacts` gains a `commands: { name; body; as }[]`; `collectArtifacts` builds the body from the agent's composed prompt (`renderPrompt(composeAgent(def))`).
- `agents/flow-install.ts` — `flowArtifacts` collects per-agent commands; `flowInstallPlan` adds a `kind: "command"` `InstallStep` with the correct target path.
- The flow-install **execution/apply** path (N126) — write the file and record it per-agent in `.claude/taskflow-managed.json`; re-apply replaces; removing the flag/agent removes the artifact (mirror existing mcp/hook/skill managed behavior).
- Name helper + **reserved-name guard** (the 10 built-ins: `task-analyze, taskmaster, taskmaster-change, task-implement, task-review, task-review-fix, task-human-review, task-git, task-incident, task-request-changes`).
- `dashboard/client/AgentForm.tsx` + `api.ts` — checkbox "Install as runnable command", `command`/`skill` toggle, derived-name preview + collision error.
- `docs/architecture-diagrams.md` Diagram 1 (slash-command list / agent lifecycle changes).

### Out of scope

- Standalone (non-flow) single-agent install — deferred.
- Full Cursor command parity. Cursor has no `.claude/commands/` concept, so for a Cursor project the command target falls back to a **skill** (`.cursor/skills/...`); a dedicated Cursor command path is out.
- Changing how the 10 built-in agents emit.
- The composed-module / bundle UI (**N137**).

## Implementation plan

1. **Schema.** Add optional `command: { install: boolean; as: "command" | "skill" }` to the composed-agent def in `core/schema/index.ts`; validate. Default = absent (no command).
2. **Name derivation + guard.** Helper `commandName(def)` = `task-` + slug(title or id minus `custom:`), skipping the prefix if the slug already starts with `task`. Reject (on save / compose) any derived name equal to a reserved built-in command name, with a clear error.
3. **Compose.** Add `commands` to `AgentArtifacts`. In `collectArtifacts`, when `command.install`, push `{ name, body: renderPrompt(composeAgent(def)), as }`.
4. **Install plan.** In `flow-install.ts`, collect commands from each flow agent and add a `kind: "command"` step to `flowInstallPlan`, target `.claude/commands/task-<name>.md` or `.claude/skills/task-<name>/SKILL.md` (skill when project editor is Cursor).
5. **Emit/execute + manage.** Extend the apply path to write the file and register it per agent in `.claude/taskflow-managed.json`; ensure idempotent re-apply and clean removal when the flag is cleared or the agent leaves the flow.
6. **AgentForm UI.** Checkbox + `command`/`skill` radio + live `task-<name>` preview; show collision error inline.
7. **Docs + diagram.** Update the composer section of `packages/taskflow/README.md`; **rework `docs/architecture-diagrams.md` Diagram 1** (the slash-command list / agent lifecycle now includes user agents).
8. **Tests.** `node:test` coverage for name derivation/double-prefix/collision, artifact collection, the new install-plan step, and managed re-apply/removal.

## Verification

- Flag an agent (target `command`), include it in a flow, run flow install → `.claude/commands/task-<name>.md` written with the composed prompt; after a Claude Code restart, `/task-<name>` runs it.
- Switch target to `skill` → `.claude/skills/task-<name>/SKILL.md` written instead.
- Name an agent `implement` (or another reserved slug) → save/compose rejected with the reserved-name error.
- An agent already named `task-foo` → emits `/task-foo` (not `task-task-foo`).
- Clear the flag and re-apply → the previously written file is removed; re-apply is idempotent.
- `pnpm typecheck` (server + client) + lint + `format:check` + `pnpm --dir packages/taskflow test` pass.

## Notes

- Root cause confirmed in code: `prompt-build.ts` writes an agent's command/role file only "when a mapping exists" (built-ins only), and `flowInstallPlan` (`agents/flow-install.ts`) emits only `mcp | hook | skill`. Evidence from the session: `is-test/insightFlow/agents/test-agent.json` composed its MCP + a skill but produced no command.
- This is the first step that makes the agent/flow layer **prescriptive** for user agents — `CLAUDE.md` flags that as a planned "later iteration", so align with that direction.
- Decisions (from /task-analyze): flag **on the agent**; target **command-or-skill configurable**; name **always `task-` prefix** with reject-on-collision + no double-prefix; **Cursor → skill only**; standalone install deferred.
- Related: **N137** (composed module / bundle UI). Diagram 1 rework required.
