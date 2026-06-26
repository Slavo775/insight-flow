# N191 — Analysis (pre-taskmaster strategist trail)

> Part of the subagents/handovers initiative (N189–N192). Full shared trail: **N190's ANALYSIS.md**.

## Problem framing

The user's converged target: "an agent that fans out and rejoins work." Once subagent emission exists (N190), the orchestrator pattern is the natural next step — but a composed agent has no way to *declare* a set of subagents or carry fan-out guidance. The rejoin ("worker done → hand back to orchestrator") needs nothing new: a subagent's only exit is returning to its caller, and the Task tool waits for all spawned subagents (automatic join).

## Goal

Let a composed agent own subagents (`subagents: [ids]`) and, on install, emit them + inject a fan-out/synthesize prompt section. Fan-out *selection* (one or several) is the orchestrator's runtime judgment, guided by each subagent's `description`.

## Options considered & decisions

- **Declaration:** loose (prompt names installed subagents) vs **explicit `subagents` field on the agent** (A+C). → **Explicit field**, so install/uninstall own the set reference-safely and "fan-out-and-rejoin" is an installable unit.
- **Join / hand-back:** new primitive vs **automatic subagent return**. → **Automatic** — no handback mechanism; "fan out and rejoin" and "worker hands back" are the same event from two ends.
- **Out:** built-in orchestrator/rewiring (N192); central controller; flow-level joins.

## Open questions

- How structured should the per-subagent "when to spawn" guidance be (prose vs a light intent field)? Start with prose + description-driven auto-delegation.
- Should an orchestrator be allowed to declare *agents* (not just subagent modules) as workers? Defer — subagent modules first.

## Sources

- `agents/compose.ts` (composition + artifact collection), `ComposedAgentSchema` (`core/schema/index.ts`), N138 (agent-as-command), N190 (subagent emission).
- Shared thread: N190's ANALYSIS.md.

## Handoff brief

In TASK.md/CHECKLIST.md: `subagents?: string[]` on the composed agent (refs to subagent-kind modules); fold into artifacts; render a delegation section in `composeAgent`; surface in MCP + dashboard; ship one example custom orchestrator. Depends on N190.
