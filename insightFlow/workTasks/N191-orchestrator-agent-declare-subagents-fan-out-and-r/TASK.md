# N191 — Orchestrator agent — declare subagents, fan out and rejoin

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

With subagent emission (N190), nothing yet lets a composed agent **own a set of subagents and fan out to them**. The target pattern — "an agent that fans out and rejoins work" — needs the orchestrator to declare its subagents and carry a prompt that spawns them in parallel and synthesizes the results. The rejoin ("worker is done, hand back to orchestrator") is automatic: a subagent's only exit is returning to its caller, and the Task tool waits for all of them.

## Goal

1. Let a composed agent **declare its subagents** (`subagents: [moduleIds]`).
2. Installing the orchestrator **emits those subagents** (via N190) and **injects a fan-out / synthesize prompt section**.
3. The fan-out selection (which subagents, one or several) is the orchestrator's runtime judgment, guided by each subagent's `description` + the rendered guidance. Rejoin/hand-back is free.

## Scope

### In scope

- **Schema (`ComposedAgentSchema`, `core/schema/index.ts`):** add `subagents?: string[]` — ids of `subagent`-kind modules.
- **Reference validation (`dashboard/server/custom-defs.ts` `validateReferences` + `user-registry` load checks):** each id must resolve to a `subagent`-kind module.
- **Artifacts:** `collectArtifacts`/`targetArtifacts` include the declared subagents (so installing the orchestrator installs them too, reference-safe).
- **Prompt (`agents/compose.ts`):** inject a `## Subagents` / delegation section listing each subagent (name + description + when to spawn) and the fan-out → synthesize → continue guidance.
- **Surfacing:** flow-install plan, composer MCP, and the dashboard agent form expose the `subagents` set.
- Ship one **example custom orchestrator** (a `custom:` agent declaring 2 subagents) to exercise the path.

### Out of scope

- Shipping a built-in orchestrator / rewiring lifecycle agents (N192).
- Flow-level joins / dependency-gating / central runtime controller (rejected — the join is the automatic subagent return).
- Changes to the lateral handover model (the orchestrator still hands the task token onward normally after synthesizing).

## Implementation plan

1. **Schema** — `subagents?: string[]` on the composed agent; validate refs resolve to subagent-kind modules.
2. **Artifacts** — fold declared subagents into `collectArtifacts`/`targetArtifacts` so install/uninstall own them reference-safely.
3. **Prompt** — render the delegation section in `composeAgent` (fan-out + synthesize + then-handover guidance).
4. **Surfacing** — composer MCP + dashboard agent form for the `subagents` field.
5. **Example + tests** — a custom orchestrator with 2 subagents; install emits both + the orchestrator prompt section; uninstall reference-safe.

## Verification

- A custom orchestrator declaring 2 subagents → install writes both subagent files (N190) **and** the orchestrator's command/skill whose prompt lists them and instructs fan-out + synthesis; uninstall removes them reference-safely.
- Composer MCP can author the orchestrator + its subagents.
- `pnpm --dir packages/taskflow test`, `tsc`, `lint`, `pnpm build` green.

## Notes

- Depends on **N190** (subagent emission).
- "Fan out and rejoin" and "worker hands back to orchestrator" are the same event from two ends — both come free from subagent return; no separate handback mechanism.
- Decision trail: this folder's `ANALYSIS.md` + the fuller thread in N190's `ANALYSIS.md`.
