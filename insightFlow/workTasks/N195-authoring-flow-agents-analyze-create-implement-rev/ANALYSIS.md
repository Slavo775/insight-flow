# N195 — Analysis (pre-taskmaster strategist trail)

> Part of the authoring-flow initiative (N194–N197). Full shared trail: **N194's ANALYSIS.md**.

## Problem framing

The authoring flow (N194) needs its agents — a lifecycle specialized for authoring
composer definitions rather than code. They mirror the default lifecycle's shape
but call the composer MCP and carry insight-flow's baseline.

## Goal

Ship 8 baseline-composed agents (analyze · create · implement · review · fix ·
human-review · test · install) with `when`-intent handovers, the gated
create→analyze re-entry, and install-after-approval.

## Decisions (inherited from N194's Q&A)

- **Baseline on every agent**: security + enforcement + protocol + activity.
- **Implement authors defs** (MCP `create_*`); **install emits artifacts** (MCP
  `install`), sequenced after human-review approval.
- **Gated create→analyze** (not auto — auto cycle back-edges are forbidden).
- **analyze asks the activity-engine opt-in** for the generated artifact.
- Each agent declares its `subagents` (ids from N196).

## Open questions

- If this ticket grows unwieldy, split into authoring-core (analyze/create/
  implement) + authoring-review (review/fix/human-review/test/install).
- Exact authoring-specific role-module content (identity/contract per agent).

## Sources

- `ComposedAgentSchema` (+ `subagents`), `modules/roles/*`, `compose.ts`,
  `handovers.json`, the drift guard (`compose.test` + `prompt-build --compose
  --apply` + `sync-role-templates.mjs`). N189 handover `when`; N191 subagents field.
- Shared trail: N194's ANALYSIS.md.

## Handoff brief

In TASK.md/CHECKLIST.md: author the 8 agents + their role modules, baseline-
composed, with `when` handovers (gated create→analyze, install-after-approval),
the activity opt-in in analyze, `subagents` wired (N196 ids), and role-file
re-sync. Depends on N194; subagent ids from N196.
