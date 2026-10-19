# N267 — Flow chains: chain existing flows into a flow-of-flows (core + CLI) — Analysis

**Created:** 2026-10-19
**Author:** task-analyze

## Problem framing

- Request: "chain the flows, not only agents — prepare → implement → deploy-beta → handle-jira — gated or automatic like for the agent."
- Clarified: it is **abstract** (not Jira-specific); **one task** travels through all flows; flows must be **reusable** in several chains; a dashboard section for chains is wanted.
- Root constraint: a task has exactly one `flowId`, locked after `ready` (N117), and every status write is validated against that flow's status set (N131). Agent handovers are prompt text baked in at flow-install time (N149). So cross-flow chaining "works" in the prompt but fails in the data: the next flow's first status write is rejected.

## Goal

- Chain existing, unmodified flows with `auto | gated` + `when` semantics, reusable across chains.
- One task, one path, same folder/history; no fan-out/join.
- Zero behaviour change for tasks without a chain.
- Chains are data (user space) + a run-time CLI handover, not prompt-time wiring, so no re-install when a chain changes.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Link on a flow's terminal (`next: { flow, mode }`) | Smallest; reuses terminals/entry agents/handover modes | The flow knows its successor → a flow cannot be reused in two chains without editing it (fails answer 4) | S |
| B — Terminal creates a new linked task (`parentId`) | Supports 1→N / N→1 later; old task stays done | New link field, dashboard must render chains of tasks; more than "one task through all flows" needs | M |
| C — Flow as a node inside a flow (nested) | Most powerful/reusable | Nested statuses, maps, installs; biggest blast radius | L |
| D — One big flow, no code | Zero cost | No reuse; one board for everything | 0 |
| **E — Chain definition outside flows (flow-of-flows)** | Flows untouched + reusable; same handover vocabulary; run-time resolution → no install; small schema | New definition kind + 3 CLI commands + registry + API; UI in separate tasks | M |

## Decision

- Chosen option: **E** (split: N267 core+CLI, N268 Chains page, N269 task-detail integration).
- Rationale: A was the first pick but reuse (user answer 4) kills it. E keeps every existing concept (terminals, entry agents, `auto|gated`, `when`, flow lock) and only adds a thin data layer plus a run-time hint. C is too large for one-task-one-path. D stays the fallback for anyone who does not need reuse.
- Locked decisions (user: "do as you think is good"):
  - Binding is explicit (`create --chain`, `set-chain` ready-only). No auto-binding by entry agent.
  - Next flow always starts at `ready` (same as `create`).
  - Gated = human "go" in chat (same as agent handovers); dashboard "Continue" button is N269.
  - Handover files skipped; the task keeps TASK.md/CHECKLIST.md/REVIEW.md + history across flows.
  - Composer MCP support for chains is a later task.

## Open questions

- `[non-blocking]` Should a chain link be allowed to point back to an earlier flow (e.g. deploy-beta failed → implement)? Design allows it; AGENT_PROTOCOL's "no auto-chaining a cycle" rule should apply (treat back-edges as gated). Implementer: do not block it in schema.
- `[non-blocking]` Should `chain-advance` accept a custom start status per link later? Not now — `ready` only.
- `[non-blocking]` Should `mergedChains()` get built-in chains (like `BUILTIN_PROJECTS`)? Not now — user space only.
- `[non-blocking]` Dashboard Kanban for a chained task: columns come from the current flow — fine for N267; N269 decides whether to show the chain position.

## Sources

- None — discussion was self-contained. Code references: `core/schema/index.ts` (ProjectFlowEdgeSchema.handover, FlowStatusSchema.terminal), `core/set-status.ts`, `cli/commands/set-flow.ts`, `cli/commands/create.ts` (resolveFlowId), `agents/compose.ts` (handoverSection), `agents/flow-install.ts` (flowHandoversByAgent), `AGENT_PROTOCOL.md` (HANDOVER DISCIPLINE).

## Handoff brief

Title: "Flow chains: chain existing flows into a flow-of-flows (core + CLI)". Type: feat. Priority: high. Tags: flows,chains,cli,core,composer. Scope: Add a new "chain" definition (insightFlow/chains/<id>.json, registered in the user registry next to modules/agents/projects) that links existing flows: nodes are flow ids, links go from a terminal status of flow A to flow B with mode auto|gated (default gated) and optional `when`, mirroring edge handovers. Flows are not modified, so one flow can be reused in many chains. Add optional Task.chainId (absent = today's behaviour), `create --chain <id>` and `set-chain` (ready-only, like set-flow), a `chain-advance --id <task> [--to <flow>]` command that at a terminal status moves the task to the next flow and sets `ready` in one write (history records the flow change), and a CLI hint printed by the shared status writer (status-write.ts) when a task with a chain reaches a terminal that has outgoing links. Add one shared rule to AGENT_PROTOCOL.md: follow a CLI-printed chain handover according to its mode. Expose chains via the existing custom-definitions CRUD API (/api/chains). Dashboard UI and handover files are out of scope — separate tasks.
