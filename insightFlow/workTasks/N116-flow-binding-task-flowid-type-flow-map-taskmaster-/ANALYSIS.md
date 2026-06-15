# ANALYSIS — Round 1 "Guide": flows become a real, correctable, visible task property (N116–N118)

## Problem framing

After N96–N115 the workspace can hold multiple project flows (default + custom), with a full
editor — but flows are purely DESCRIPTIVE: nothing connects a TASK to a flow, so neither the human
nor the AI knows which flow governs a given task ("how should I know what flow the AI works in").
The task map (N104) + next-step suggestions (N105) are hardwired to the default flow. This is the
"prescriptive later" the whole line deferred. Round 1 makes flows a real, visible, correctable
property without seizing control of the lifecycle.

## Goal

Three small tasks: N116 bind a task to a flow at creation (Task.flowId, taskmaster picks by type);
N117 correct a wrong pick (set-flow, ready-only); N118 surface the task's flow + next step (Guide,
reusing N105's engine). The human still invokes every agent.

## Options considered

1. **Flow selection** — shared taskmaster picks the flow by task type via a config map (CHOSEN)
   vs. a distinct master/entry agent per flow (1:1; invoke = pick — cleaner but a master agent per
   flow) vs. one active flow per workspace (too rigid). The human chose the shared-master path:
   deterministic type→flow map, AI can pick wrong, override fixes it.
2. **Changing a wrong flow** — allowed only while `ready`, locked after (CHOSEN) vs. anytime with
   mid-lifecycle mismatch handling (N104 graceful pattern). Chosen because locking after `ready`
   eliminates the hardest edge case (a task's status orphaned against a flow lacking that stage) —
   no reconciliation logic needed at all.
3. **How prescriptive** — phased: Guide now, Drive later (CHOSEN) vs. Guide-only vs. Drive-now.
   Guide = surface the next agent (reuse N105), human invokes; Drive = pickers/prompts read the
   flow as source of truth + agent stage-vs-utility kinds. Phasing de-risks by proving the flow
   data is trustworthy before letting it govern.

## Decision

Round 1 = Guide: N116 (flowId + type map) → N117 (set-flow, ready-only) → N118 (surface flow +
next step). No picker / state-machine change. flowId values are project ids ("default" /
"custom:<slug>"). The "master agent" idea resolved to: the shared taskmaster is the entry/owner
that binds the flow at create — no new per-flow agent type this round.

## Open questions

- Round 2 "Drive": next/next-review read the flow (retire query.ts STATUS_WEIGHT for flow-bound
  tasks); role prompts treat the flow as the authoritative handoff; agent stage-vs-utility kinds
  (so the picker walks stage→stage and treats git/incident as callable-anywhere). This is also
  where the human's "constrain which agents go in a flow" instinct lands.
- Optional small follow-up: prompt-build appends "Next per <flow>: /agent" to role outputs.
- task-git's dual nature (a stage that produces `pushed` AND a utility invoked inline) — a Drive-
  round modeling question, not Round 1.

## Sources

- packages/taskflow: core/schema (Task, ProjectSchema), core/config, cli/commands/create.ts +
  query.ts (cmdNext STATUS_WEIGHT — the current flow-agnostic handoff), core/flow-status.ts
  (currentFlowNodes/suggestNextSteps — N104/N105 engine, today hardwired to the default flow),
  dashboard TaskDetailPage / ProjectPage (N104/N105/N108 surfaces).
- /task-analyze session 2026-06-15 with the human; forks: shared-master-picks-by-type,
  change-only-while-ready, phased Guide→Drive.

## Handoff brief

Created N116–N118 via taskmaster on 2026-06-15, all `ready`, priority medium, tags flow/core/
cli/dashboard. Round 1 of the phased plan; Round 2 (Drive) deferred. No risky behavior changes —
flows become a label that GUIDES, not one that seizes the wheel.
