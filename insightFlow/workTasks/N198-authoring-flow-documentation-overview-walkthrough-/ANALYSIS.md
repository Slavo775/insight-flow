# N198 — Analysis (pre-taskmaster strategist trail)

## Problem framing

The authoring flow (`composer-authoring`, N194–N197) lets a user build custom
modules/agents/flows through a guided lifecycle, but it's effectively
undocumented. The building blocks already have docs — `concepts/` (modules /
agents / flows / handover), `composer-mcp/` (+ the `describe` tool, N196), and a
`subagents/` page — yet nothing stitches them into the narrative a user actually
follows. The owner wants intro/purpose + how-to-use + agent descriptions
("what they can do, what they don't").

## Goal

A small, drift-resistant "Authoring" docs section: the intro, the how-to (with a
worked example), and an agents/subagents reference — without duplicating the
concept docs or transcribing the frequently-changing prompts.

## Options considered

- **Structure:** (a) dedicated 3-page section · (b) one long page · (c) extend
  existing built-ins/subagents pages. → **(a)** — Diátaxis-aligned (overview =
  explanation, walkthrough = how-to, reference), room to grow, and keeps the
  story in one place.
- **Agent/subagent depth:** (a) compact tables + links to the live dashboard map
  and `describe` · (b) full prose per entity. → **(a)** — the 8 agents + 12
  subagents are code-defined and changed ~6× in one session; hand-written prose
  for all 20 would rot. Tables (purpose · does · doesn't) + live links stay
  accurate. **This is the defining constraint.**
- **Worked example:** (a) yes — author a custom module end-to-end · (b) concepts
  only. → **(a)** — the most useful part; gives the reader something to follow.

## Decision

Dedicated `website/docs/authoring/` section, 3 pages (Overview · Walkthrough ·
Agents & subagents reference), compact tables + live links (no prompt
transcription), one worked example (author a custom module), cross-linked to
`concepts/` / `composer-mcp/` / `subagents/`. Additive website-only; no source
changes. Type docs, priority medium.

## Open questions

- Exact sidebar position (near `composer-mcp/` vs a top-level "Customization"
  area) — settle during authoring.
- Whether to later auto-generate the reference tables from the registry
  (deferred; tables + live links suffice for now).
- Light touch vs. small rewrite of the pre-existing `subagents/` page (prefer
  link-only unless it reads as a contradiction).

## Sources

- This session's authoring initiative (N194–N197): the flow, the 8 agents, the 12
  per-kind subagents, the reuse-first policy, the `describe` tool + conventions
  module. Committed on `feat/authoring-flow` (`bf91837`).
- Existing docs surveyed: `concepts/`, `composer-mcp/` (+ `tools.md` describe),
  `subagents/`, `built-ins/`. Site uses Diátaxis.

## Handoff brief

Create a `website/docs/authoring/` section (Overview / Walkthrough / Agents &
subagents reference) documenting `composer-authoring`. Drift-resistant: compact
tables (purpose · does · doesn't) + links to the dashboard map and `describe`,
never prompt transcription. Include a worked example (author a custom module).
Cross-link to concepts/composer-mcp/subagents; don't duplicate them. Gate on
`pnpm --dir website build`. Out: source changes, prompt transcription, registry
auto-generation.
