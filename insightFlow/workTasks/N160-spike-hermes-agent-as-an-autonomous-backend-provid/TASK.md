# N160 — SPIKE: hermes-agent as an autonomous backend/provider

**Type:** chore
**Priority:** low
**Created:** 2026-06-18

## Problem

- **RESEARCH SPIKE — no production code.** Nous Research hermes-agent is a Python autonomous agent (skill-learning loop, persistent memory, 300+ models, 40+ tools, **MCP support**, CLI + messaging daemon for Telegram/Discord/Slack/…). This spike assesses whether it fits insight-flow as (a) an alternative autonomous backend that runs insight-flow roles, or (b) a messaging front-end — and is explicitly allowed to conclude **"not now."** It's the most speculative of the three external tools.

## Goal

1. A fit assessment of hermes-agent against insight-flow's model (it's an autonomous assistant, NOT an interactive editor or CI executor).
2. Identify the realistic integration vector — likely **MCP** (consume insight-flow's task state; ties to N158).
3. A clear go/no-go that may be "not now," with the reasoning recorded so it isn't re-litigated.

## Scope

### In scope (research only — findings into a decision doc; do NOT ship code)

- What hermes-agent's value-add would be for insight-flow vs Claude/Cursor/OpenHands (skill memory? messaging fronts? open-model autonomy?).
- The likely integration vector: hermes consuming insight-flow via the proposed **MCP server (N158)** — i.e. this may reduce to "if N158 ships, hermes is just another MCP client."
- Whether a hermes "provider" (like the N75–N78 claude/cursor seam) even makes sense given hermes isn't an editor.
- Licensing/runtime cost (Python, daemon) considerations for a Node/TS project.

### Out of scope

- No production integration, no dependency, no provider implementation.
- No change to existing behavior.

## Research plan

1. **Characterize** hermes-agent's model + where (if anywhere) it adds value over the agents insight-flow already supports.
2. **Assess** MCP-as-vector (does N158 subsume this?) and the messaging-front-end angle.
3. **Decide** go/no-go — "not now" is an acceptable, well-reasoned outcome.

## Verification

- Deliverable: a fit-assessment decision doc in this folder (value-add, MCP vector, provider-fit, go/no-go).
- No source/test changes committed.

## Notes

- Source: /task-analyze evaluation of github.com/nousresearch/hermes-agent (autonomous, MCP-capable, messaging daemon, MIT). Most speculative fit; likely subsumed by N158 (MCP) if it goes anywhere. Lowest priority.
