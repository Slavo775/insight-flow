# N196 — Analysis (pre-taskmaster strategist trail)

> Part of the authoring-flow initiative (N194–N197). Full shared trail: **N194's ANALYSIS.md**.

## Problem framing

The authoring agents (N195) should fan out to subagents for per-stage work:
inventory existing defs (dedup/reuse), author each kind, review the result. The
question the user posed — "how many subagents?" — was decided as **start lean**.

## Goal

Ship 3 broad built-in `subagent` modules and wire them onto the authoring agents,
with dedup/reuse + best-practice baked into the analyst/reviewer prompts.

## Decisions

- **Lean, not per-kind.** 3 broad: `composer-analyst` (read-only; inventory +
  dedup via MCP `list`/`get`), `composer-author` (authors defs via MCP
  `create_*`), `composer-reviewer` (read-only; schema/dedup/best-practice). Split
  to per-kind (~10: module/agent/flow/handover analysts+authors+reviewers) later
  only if a kind proves genuinely deep.
- **Dedup/reuse is a first-class behavior** — analyst/reviewer must check the
  merged registry for an existing def before creating, and prefer reuse/extension.
- **Best practices** encoded in prompts (custom: ids, baseline modules, locked-kind
  awareness, handover `when`).

## Open questions

- Whether `composer-author` needs the write/MCP tool scope vs. the orchestrator
  agent doing the `create_*` calls itself (subagent vs parent responsibility).
- When to split per-kind (signal: a kind's authoring prompt gets too large/complex).

## Sources

- N190 (subagent module kind), N191 (orchestrator `subagents` field), the composer
  MCP tool surface (N188). Shared trail: N194's ANALYSIS.md.

## Handoff brief

In TASK.md/CHECKLIST.md: ship 3 broad subagent modules (analyst/author/reviewer),
encode dedup/reuse + best-practice, wire onto N195 agents via `subagents`, scope
`tools` (analyst/reviewer read-only). Depends on N195; start lean, grow per-kind
later.
