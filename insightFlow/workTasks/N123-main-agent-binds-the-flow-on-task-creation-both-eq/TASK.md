# N123 — Main-agent binds the flow on task creation (both-equal with type-map)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Today flow selection is by task type → flow map (N116). The human wants 'both equal': creating a task via a **main/entry agent** binds the task to that agent's flow, while the type-map still binds by type — whichever the user does first wins.

## Goal

1. Creating a task via a main/entry agent binds `flowId` to that agent's flow (e.g. `create --agent <id>`, or the agent's create path resolves its flow from `entryAgents`).
2. Coexists with N116 (`--flow` / `flows.byType[type]`): explicit `--flow` wins; otherwise `--agent`'s flow, else the type-map, else `defaultFlow`.
3. A main agent that belongs to MULTIPLE flows is rejected/disambiguated (clear error or `--flow` required).
4. The resolved binding + its source (agent / type / explicit / default) is reported.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/create.ts` — extend `resolveFlowId` with `--agent` → owning flow (reverse-lookup via `entryAgents` across `mergedProjects`); precedence `--flow` > `--agent` > byType > defaultFlow.
- Disambiguation when an agent is an entry of >1 flow.
- Tests: `--agent` binds its flow; multi-flow agent → error/`--flow`; precedence matrix.

### Out of scope

- Declaring entry agents (N122). Custom agents as invokable commands (N124). Changing N116's type-map.
- Auto-running the agent — this only sets `flowId` at creation.

## Implementation plan

1. **Reverse lookup** — agent id → the flow whose `entryAgents` includes it (over merged projects).
2. **Precedence** — `--flow` > `--agent` > `byType[type]` > `defaultFlow`; unknown → default fallback (N116 rule).
3. **Disambiguation** — >1 owning flow → error requiring `--flow`.
4. **Tests** — binding + precedence + ambiguity.

## Verification

- `pnpm build` + suite green.
- `create --agent taskmaster` binds the default flow; a custom main agent binds its flow; an agent owning two flows errors without `--flow`; `--flow` overrides.
- N116 type-map path still works unchanged.

## Notes

- Depends on N122 (+ N116). 'Both equal' per /task-analyze. See N119/ANALYSIS.md.
