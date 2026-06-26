# N189 — Analysis (pre-taskmaster strategist trail)

> Part of the subagents/handovers initiative (N189–N192). Full shared trail: **N190's ANALYSIS.md**.

## Problem framing

Working the four handover cardinalities (1→1, 1→N, N→1, N→N) against the single-task-token model showed that the **only genuine gap in the handover mechanism itself** is the *branch decision*. An agent with multiple handovers already free-picks one (`compose.ts` `handoverSection`: "it free-picks the one matching its outcome"), but the discriminator is only the `on` status; the *reason* to take a branch lives in prose, isn't data, and isn't visible in the flow graph.

## Goal

Make the 1-of-N branch decision explicit and auditable: a structured `when`/reason per handover, rendered into the agent prompt and shown in the flow editor.

## Options considered & decisions

- **Discriminator:** keep status-only (status quo) vs prose vs **structured `when`**. → **Structured `when`**, optional, human-readable; the flow stays descriptive (the agent still decides — `when` guides + documents, no runtime enforcement).
- Everything else people associate with "advanced handovers" was reassigned: **fan-out/join → subagents (N190/N191)**; **return-to-coordinator → already works** as a gated back-edge (auto-cycles intentionally not chained); **cross-task join → rejected** (workflow-engine).

## Open questions

- Is a free-text `when` enough, or is a light enum/condition grammar wanted later? (Start with free text.)

## Sources

- Handover model: `core/flow-status.ts` (`FlowEdge`, `AgentHandover`, `suggestNextSteps`), `agents/compose.ts` (`handoverSection`), `agents/flow-install.ts` (`flowHandoversByAgent`).
- Shared thread: N190's ANALYSIS.md.

## Handoff brief

In TASK.md/CHECKLIST.md: add optional `when` to edge `handover` + handover module; thread through `AgentHandover`/`flowHandoversByAgent`; render in `handoverSection`; edit in the flow editor. Independent of the subagent tasks.
