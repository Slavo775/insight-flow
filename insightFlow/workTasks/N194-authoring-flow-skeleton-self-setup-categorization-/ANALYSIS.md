# N194 — Analysis (pre-taskmaster strategist trail)

> Shared decision trail for the **authoring-flow initiative (N194–N197)** — the
> second built-in flow for creating custom modules/agents/flows. Siblings
> reference this document.

## Problem framing

insight-flow could now *build* customizations (composer MCP N188, subagents
N190/N191, handover `when` N189) but had no guided lifecycle for *authoring* its
own modules/agents/flows. The user wants a second built-in flow — an
"authoring / self-setup" lifecycle — that designs and builds custom defs with
analysis, creation, implementation, review, and install, helped by subagents and
the composer MCP.

## Goal

Ship a second built-in flow + its agents + a lean subagent set + the MCP wiring,
covering the full lifecycle (analyze → create → implement → review → fix →
human-review → test → install), so a user can be guided through building a custom
module/agent/flow with dedup/reuse + best-practice checks.

## Options considered & decisions (from the strategist Q&A)

1. **Categorization of authoring tasks** — new task `type` vs `flowId`-based
   filter. → **`flowId`** (the flow *is* the "self-setup" category). No new task
   type (avoids schema/picker/stats/dashboard ripple).
2. **MCP lifecycle** (start/stop/recover) — the user imagined agent-managed
   server lifecycle. → **stdio has no running state**; the harness spawns/stops
   `insight-flow mcp` per session. So no start/stop/recover logic — just ensure
   `mcp-composer` is registered. (Confirmed by user — "less token, just use the
   stdio server.") An HTTP MCP (to enable agent-managed lifecycle) was rejected
   (reverses N188).
3. **Scope** — full lifecycle vs lean. → **Full lifecycle**, "cover as many cases
   as possible," ending with an **install agent that installs the flow after
   approval**.
4. **Subagent granularity** — ~10 per-kind vs lean. → **Start lean** (3 broad:
   `composer-analyst`/`author`/`reviewer`); split per-kind later if justified.
5. **Analyze-first** — auto back-edge vs entry-agent vs gated. → **Gated**: if a
   user starts at `create`, the create agent gated-hands to `analyze` first
   (auto cycle back-edges are forbidden by the enforcement/protocol safety rule,
   so gated is the safe form).

Other locked points: every authoring agent carries the **baseline**
(security/enforcement/protocol/activity); the **analyze** agent asks whether the
user wants the activity engine (+ opt-ins) in their generated artifact;
**implement authors defs** (MCP `create_*`), **install emits artifacts** (MCP
`install`).

## Ticket decomposition (4, dependency-ordered)

- **N194** — flow skeleton + `flowId` categorization (this ticket; the backbone).
- **N195** — the 8 authoring agents (baseline-composed; `when` handovers; gated
  create→analyze; install-after-approval; activity opt-in).
- **N196** — lean subagents (3 broad) + dedup/reuse + best-practice.
- **N197** — composer-MCP wiring (`mcp-composer` in the flow `install`; stdio
  guidance/docs).

Build order N194 → N195 → N196 → N197.

## Open questions

- Whether the full 7–8-agent lifecycle is overkill for *trivial* "add one module"
  (kept simple-creation as a direct dashboard/MCP action; the flow is for
  non-trivial/whole-flow authoring) — revisit if it feels heavy in practice.
- Whether 3 broad subagents suffice or per-kind splitting is needed (start lean).
- Sequencing N194↔N195: the flow validates against its agent set, so land minimal
  agent stubs (or N195 first for the agent ids) before the flow validates.

## Sources

- This session's strategist thread; the composer model (`ProjectSchema`,
  `ComposedAgentSchema` + `subagents`, `AgentModuleSchema` incl. `subagent`),
  `default.json`, the handover safety rule ("no auto-chaining a cycle back-edge").
- Foundations: N188 (composer MCP), N189 (handover `when`), N190 (subagents),
  N191 (orchestrators).

## Handoff brief

In TASK.md/CHECKLIST.md: ship the second built-in flow (entry=analyze, gated
create→analyze, terminal install-after-approval), `flowId`-based "self-setup"
filtering, no new task type. Out: agents (N195), subagents (N196), MCP wiring
(N197).
