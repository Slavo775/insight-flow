# N138 — Analysis

## Problem framing

Custom agents created in the dashboard cannot be run. The user built `custom:test-agent` and expected `/task-test-agent`, but no such command exists. Diagnosis: composing/applying an agent emits only its **module** artifacts (mcp/hook/skill); the agent's own composed prompt is written to a command/role file only for the 10 built-in agents, and `flowInstallPlan` has no `command` step. So user agents are "descriptive only" today.

## Goal

Let an agent opt in to installing a runnable `/task-<name>` command (or skill) whose body is the agent's composed prompt, emitted as part of flow install and managed idempotently.

## Options considered

1. **`agents.custom` in `taskflow.config.json` + `insight-flow init`.** Already produces `.claude/commands/<name>.md`, but uses a hand-written prompt — it does not carry the dashboard agent's composed modules, and isn't tied to flow install. Rejected as the primary path (doesn't match what users build in the dashboard).
2. **Auto-emit a command for every custom agent on apply.** Rejected — noisy; not every agent should be a command. Opt-in is better.
3. **Opt-in flag on the agent + new `command` install-plan step (chosen).** Agent carries `command: { install, as }`; flow install collects and emits it, tracked in `taskflow-managed.json`. Matches the user's mental model ("checkbox on the agent; install with the flow") and reuses the existing compose/flow-install/managed machinery.

## Decision

Option 3. Flag **on the agent**; target **command | skill (configurable)**; name **always `task-<slug>`** with reject-on-collision against the 10 built-ins and no double-prefix; **Cursor → skill** only; standalone (non-flow) install deferred. First step toward a prescriptive flow layer.

## Open questions

- Reserved-name collision UX: hard error on save (chosen default) vs auto-suffix.
- Exact field shape: `command: { install, as }` vs separate `installCommand` + `emitAs`.
- Whether removal should also prune an emitted skill dir if empty.

## Sources

- `packages/taskflow/src/cli/commands/prompt-build.ts` — composed agent's role/command file written only "when a mapping exists" (built-ins).
- `packages/taskflow/src/agents/flow-install.ts` — `flowInstallPlan` emits only `mcp | hook | skill`.
- `packages/taskflow/src/agents/compose.ts` — `collectArtifacts` / `composeAgent` / `renderPrompt` (reuse for the command body).
- `packages/taskflow/src/dashboard/client/AgentForm.tsx` — where the UI flag lands.
- Session evidence: `is-test/insightFlow/agents/test-agent.json` (composed MCP + skill, no command).
- `CLAUDE.md` — flow layer "descriptive for now … a later iteration flips it prescriptive."

## Handoff brief

feat / medium priority / tags: agents, composer, flow-install, commands. Add an opt-in command-install flag (`command | skill`) to composed agents; emit a new `command` step in `flowInstallPlan`; write the composed prompt to `.claude/commands/task-<name>.md` (or skill), managed via `taskflow-managed.json`; force `task-` prefix with collision/double-prefix guards; Cursor → skill; AgentForm UI; rework architecture Diagram 1. Related: **N137** (composed module UI).
