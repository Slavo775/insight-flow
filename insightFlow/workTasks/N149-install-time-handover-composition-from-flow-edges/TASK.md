# N149 — install-time handover composition from flow edges

**Type:** feat
**Priority:** medium
**Created:** 2026-06-18

## Problem

- Edge-level handovers (N147) are project-scoped data; nothing yet turns them into the agent's prompt. The owner's requirement — "choose handover → the agent builds with a special handover section" — is realized at **flow install time**: when a flow is installed, each source agent's emitted command/skill must include a `## Handover` section composed from that flow's edge handovers (where `from === agent`), MERGED with the agent's global N142 handover modules. This is what lets a **built-in** agent gain a per-flow handover section without mutating the shared agent or the global `*_ROLE.md`.

## Goal

1. Installing a flow composes, per source agent, a `## Handover` section from the flow's `edge.handover` entries (`from === agent`), merged with the agent's global (N142) handovers.
2. The merged section is emitted into that agent's installed command/skill artifact (not the global agent / not `*_ROLE.md`).
3. Built-in source agents get the per-flow section; nothing in `COMPOSED_AGENTS` or the repo's role files changes.
4. Duplicate handovers (same `to`+`on`+`mode` already global) are de-duped.

## Scope

### In scope

- `packages/taskflow/src/agents/flow-install.ts` — the install-plan builder: for each agent in the flow that emits a command/skill, derive its flow-scoped handovers from `project.flow.filter(e => e.from === agentId && e.handover)`.
- `packages/taskflow/src/agents/compose.ts` — reuse `handoverSection`/`handoverAction` (N142/N145) to render the merged handover list; add a helper that takes (agent's global handover modules + flow edge handovers) and returns the single combined `## Handover` section, deduped.
- The emit path (`agents/emit.ts` / `collectArtifacts` command body in `compose.ts`) — when emitting an agent's installable command/skill for a flow install, append/merge the flow-derived `## Handover` section into the composed prompt body.
- The N126 install endpoint (`dashboard/server/index.ts` install route + SSE) — pass the project/flow context so the emitter can read `edge.handover`.

### Out of scope

- Edge schema (N147) and editor UI (N148) — assumed merged.
- Diagram rendering (N150).
- The global `*_ROLE.md` and `COMPOSED_AGENTS` — must stay byte-identical (handovers are added only to the installed artifacts, per flow).
- No change to N142 agent-level handover semantics; this MERGES with them.

## Implementation plan

1. **Derive flow handovers.** In `flow-install.ts`, build `handoversByAgent` from `project.flow` edges carrying `handover` (resolve `on` aliases via the flow's `states` + `resolveTrigger`, consistent with N146).
2. **Merge + compose.** Add a compose helper `composeHandoverSection(agentId, globalHandovers, flowEdgeHandovers)` reusing `handoverAction`; dedupe by `(to, on, mode)`; return one `## Handover` section (or none).
3. **Inject into the artifact.** Where `collectArtifacts`/emit produces the agent's command/skill body (`def.command.install`), append the flow-derived section to the composed prompt for THIS install (do not alter `composeAgent`'s global output).
4. **Endpoint wiring.** Ensure the install endpoint/plan passes the active project so the emitter has the flow edges.
5. **Tests.** Unit-test the merge/dedupe + that a built-in agent's installed body gains the section while `composeAgentById` (global) is unchanged.

## Verification

- `pnpm --dir packages/taskflow test` passes incl. new merge/compose tests and the existing drift guard (global `*_ROLE.md` unchanged).
- Install a custom flow with a Taskmaster→X edge handover (auto): the emitted `task*` command for Taskmaster contains a `## Handover` section listing X (auto); the global `TASKMASTER_ROLE.md` is unchanged.
- An agent with both a global N142 handover and a duplicate flow edge handover emits one, de-duped.

## Notes

- Depends on **N147**. Independent of N148/N150 but consumes N148-authored data in practice.
- Reuse `compose.ts` `handoverSection`/`handoverAction`; reuse N146 `resolveTrigger` for alias-correct matching. Keep the global composer output untouched — flow handovers are install-artifact-only.
