# N124 — Custom composer agents scaffolded as slash commands

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- There are two disjoint notions of 'custom agent': the legacy `config.agents.custom` (N12) which `init` scaffolds as a `/`-command, and the composer agents in `insightFlow/agents/` (N107) which are NOT scaffolded as commands. The human wants custom (incl. main) agents invokable as `/<agent-id>`; the two notions should converge.

## Goal

1. `init` / `prompt-build` scaffold a `/<agent-id>` slash command for each composer custom agent (`insightFlow/agents/`).
2. The legacy `config.agents.custom` path and the composer path converge (one source of scaffolded custom commands — composer-first; legacy mapped or deprecated with a note).
3. A custom **main** agent (N122/N123) becomes invokable as `/<agent-id>` so it can start its flow.
4. Built-in role commands are unchanged.

## Scope

### In scope

- `packages/taskflow/src/agents/init/` + `cli/commands/prompt-build.ts` — emit commands for composer custom agents (compose their MD via `composeAgentById` over the merged registry).
- Convergence with `buildSkillList(customAgents)` (legacy) — unify or bridge.
- Tests: a custom agent → a scaffolded `/agent-id` command with its composed body; built-ins unchanged.

### Out of scope

- Defining/marking main agents (N122). Binding (N123). New agent kinds.
- Per-harness (cursor) specifics beyond the existing provider seam.

## Implementation plan

1. **Scaffold** — for each composer custom agent, write `.claude/commands/<id>.md` (+ cursor equivalent via the provider seam) with the composed prompt.
2. **Converge** — make composer agents the canonical custom-command source; map/deprecate `config.agents.custom`.
3. **Tests** — custom-agent command scaffolding + built-in parity.

## Verification

- `pnpm build` + suite green.
- Fresh-init with a composer custom agent → `/agent-id` command exists with the composed body; built-in commands byte-identical.
- A custom main agent is invokable.

## Notes

- Depends on N107 + N122. See N119/ANALYSIS.md.
- Closes the human's open question 'should custom agents have a slash command' — yes.
