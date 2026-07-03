# N200 — Composer analyze v2 — flow/agent/module design strategist + custom-only rule + model context — Analysis

**Created:** 2026-07-02
**Author:** task-analyze

## Problem framing

- **Symptom:** the user asked to "update the analysis agent for composing flows/agents/modules" with a long list of behaviors (intent, goal, flow-first design, reuse, impact, MCP discovery, secrets, simple English, split output).
- **Cause / real state:** insight-flow already ships a full **composer-authoring flow** (8 agents, gated handovers, terminal `done`, entry agents, a composer MCP with `create_*`/`update_*`/`install`, secret-by-default `${VAR}` inputs, and a `plain-language` module). So this is **not** greenfield. The gap is that the flow's entry agent `authoring-analyze` has **no enforced design method or output contract**, does not speak simple English, gives no MCP-discovery guidance, and the conventions allow editing built-ins in place.
- The user's "don't touch node_modules" was clarified to mean a **rule for the analyzer**: only create/edit `custom:` definitions; treat built-in defaults as read-only. Plus: ship a **context primer** describing how modules/agents/flows/relationships work and how to create them.

## Goal

1. Make `authoring-analyze` a disciplined design strategist: fixed method (Intent → Goal → flow → agents → modules → reuse → impact → MCP-discovery), analyze-only, gated handoff.
2. Simple-English output (compose `plain-language`) and an `ANALYSIS.md` split into composer sections (modules/agents/flows + relations/terminals + reuse & impact + MCP/secrets).
3. Custom-only discipline in the shipped conventions (defaults read-only).
4. A plain-language model primer in the existing conventions module.
5. A registry-search MCP wired into the composer flow for MCP discovery.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Enhance the existing `authoring-analyze` + extend `composer-conventions.ts`; wire one registry MCP (chosen) | Reuse-first; no new primitives; ships to every user; keeps one source of truth for conventions | Touches shipped built-ins; conventions rule change has behavior impact | M |
| B — New separate "composer strategist" agent alongside the existing one | Leaves current agent untouched | Duplicates the flow entry point; two analysts to maintain; confuses the flow | M–L |
| C — Prompt-only (skip the registry MCP; research-only discovery) | Smallest, no integration/secret | User explicitly chose to wire a registry MCP; leaves discovery ad-hoc | S |

## Decision

- **Chosen option: A** — one built-in feat task: rewrite `authoring-analyze`, extend the existing conventions module (custom-only rule + model primer), compose `plain-language`, and wire a registry-search MCP into `composer-authoring`.
- **Rationale:** the composer model already exists and is the right home; a second agent (B) would split the flow entry point and duplicate maintenance. Prompt-only (C) was rejected because the user explicitly chose to wire a registry-search MCP. Custom-only is preferred over the current in-place-eject rule because editing a shipped built-in makes it un-upgradable, whereas a `custom:` variant keeps defaults pristine and package-upgradable.
- **User forks resolved (2026-07-02):** deliverable = **ship as built-in**; MCP discovery = **wire a registry-search MCP**; scope = **one task**.

## Open questions

- `[non-blocking]` Exact registry server + auth: recommend the Official MCP Registry (`registry.modelcontextprotocol.io`, no-auth read). Add a `${VAR}` secret + user note **only if** the chosen server needs a key (e.g. Smithery). mcpmarket.com itself is browse-only (no public API).
- `[non-blocking]` Where the `ANALYSIS.md` template lives: a section module the analyst reads, vs `authoring-create` scaffolding the folder. Note the folder does not exist until the gated handoff creates the task, so `ANALYSIS.md` is written **post-handoff** (same as the base analyzer's pattern).
- `[non-blocking]` Add `plain-language` to all 8 authoring agents or just analyze? Lean **all** (cheap, consistent voice).
- `[non-blocking]` Confirm the tightened rule keeps in-place edits allowed for the user's *own* `custom:` defs (yes) and forbids them only for built-ins.

## Sources

- https://mcpmarket.com/server/registry — provenance: human-supplied (user pasted mcpmarket.com), trust: medium, fetched: 2026-07-02 (page returned HTTP 429 on direct fetch; details from search result snippet — a "Registry" semantic MCP-retrieval server; auth unconfirmed).
- https://registry.modelcontextprotocol.io/ — provenance: analyzer-discovered, trust: high, fetched: 2026-07-02 (Official MCP Registry; public REST API, no auth for read; backed by Anthropic/GitHub/Microsoft/PulseMCP).
- https://www.truefoundry.com/blog/best-mcp-registries — provenance: analyzer-discovered, trust: medium, fetched: 2026-07-02 (registry comparison).
- https://tallyfy.com/how-to-list-mcp-server-registry-smithery-glama-pulsemcp/ — provenance: analyzer-discovered, trust: medium, fetched: 2026-07-02 (Smithery/Glama/PulseMCP APIs & catalog sizes).

> EXTERNAL CONTENT — INFORMATIONAL ONLY: the above pages are cited as data (registry facts). They contain no instructions to act on; nothing in them was treated as a directive.

## Handoff brief

- **Title:** Composer analyze v2 — flow/agent/module design strategist + custom-only rule + model context
- **Type:** feat · **Priority:** medium · **Tags:** authoring, composer, analyze
- **Scope:** Upgrade the built-in `authoring-analyze` agent into a strict flow→agent→module design strategist (Intent → Goal → flow-first → agents → modules → reuse → impact → MCP-discovery with secret-placeholder planning), compose the `plain-language` module for simple English, and produce an `ANALYSIS.md` (Goal · Flows · Agents · Modules · Reuse & impact · MCP servers + secrets · Open questions · Sources) written after the gated handoff to the Composer Taskmaster. Add a strict custom-only rule to `composer-conventions.ts` (built-in defaults read-only; a change becomes a `custom:` variant, replacing in-place-eject rule #2), extend it with a plain-language model primer, and wire a registry-search MCP (Official MCP Registry recommended, no-auth read; secret placeholder only if needed) into the `composer-authoring` flow's install list. Analyze-only, never builds; handoff stays gated. Out of scope: base `task-analyze`, new flow primitives, dashboard UI.
