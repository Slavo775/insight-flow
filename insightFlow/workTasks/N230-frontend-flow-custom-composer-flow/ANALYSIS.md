# N230 — Frontend Flow (custom composer flow) — Analysis

**Created:** 2026-07-13
**Author:** authoring-analyze

## Problem framing

- The real goal is a **repeatable, UI-specialized lifecycle** for insight-flow's frontend work — one that knows the two very different UI surfaces (master-server HTML vs dashboard React), reads the user's Lovable design (via the Lovable MCP), maximizes component reuse, and holds a real front-end quality bar (performance, accessibility, semantic HTML, CSS hygiene).
- Symptom: UI changes are ad-hoc, surface choice is unclear, and FE quality is not enforced. Cause: no owned flow for "analyze the UI intent → plan → implement with FE discipline → review".
- This is a **flow** customization (project layer), built with the composer — 4 agents, with subagent fan-out for the analyzer's parallel checks and the reviewer's AI pass, plus a new MCP server (Lovable).

## Goal

1. Custom flow `custom:frontend` (4 `task-fe-*` agents) that analyzes (code + Lovable), plans into a reuse-first checklist, implements with FE discipline, and reviews UI code in a dual AI-then-human pass.
2. `done` reachable only after human approval; both UI surfaces handled; live dashboard status; Claude + Cursor.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Clone composer-authoring topology, 4 FE agents + Lovable MCP (chosen) | Exact analyze→plan→implement↔review(dual AI+human)→done shape already proven; keeps the human gate; lean | New FE sections + Lovable MCP to author | Medium |
| B — Extend the default flow's UI review | Reuses many built-ins | Default splits AI/human across 2 agents + routes through git; heavier and wrong shape for a standalone UI flow | Medium |
| C — Single mega-agent (analyze+build+review) | Fewer parts | No separation, no human review gate, no reuse discipline; violates single-responsibility | Low |

Sub-decisions (user-locked):
- **Entry:** analyze-only (forces surface + reuse analysis first).
- **Verify:** implementer self-checks (typecheck/build/UI); the human review pass is the final gate — no separate verify agent.
- **Harness:** Claude + Cursor. **Activity:** on. **Lovable OAuth:** accepted (browser login on first use).
- **Spec change:** re-invoke the plan agent (no extra edge).

## Decision

- **Chosen option: A** — clone the `composer-authoring` topology, specialized for FE, plus the Lovable MCP.
- Rationale: `composer-authoring` is the only built-in with the exact dual AI-then-human review shape the user asked for; cloning it keeps the load-bearing `ai-approved`→self-loop→`approved`→`done` guard so `done` is human-gated. Registry is built-in-only for these roles, so all FE agents/sections are authored as `custom:` variants; shared discipline modules (`security`/`enforcement`/`protocol`, `template-copy`, `minimal-diff`, `scope-guard`, `critique-style`, `recorder-discipline`, `activity`) are reused as-is. The Lovable MCP is a small new `mcp-server` module (OAuth, no secret).

## Open questions

- `[non-blocking]` Lovable MCP is remote OAuth — the user approves a browser login the first time an FE agent uses it. Accepted.
- `[non-blocking]` Project id `c27ddae3-ad00-4532-9f79-924bf080ee19` is passed in the analyzer/implementer prompts (Lovable tool arguments), not the server config.
- `[non-blocking]` Cursor may add a public `auth.CLIENT_ID` entry for the Lovable MCP (not a secret).
- `[non-blocking]` Stray `custom:test` flow in the registry — ignored (out of scope).

## Sources

- Lovable MCP config + OAuth: https://docs.lovable.dev/integrations/lovable-mcp-server — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.
- Lovable MCP overview: https://lovable.dev/mcp ; https://www.pulsemcp.com/servers/lovable — provenance: analyzer-discovered, trust: medium, fetched: 2026-07-13.
- Registry inventory via composer MCP (built-in only for these roles; composer-authoring is the clone target) — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.
- Codebase surfaces: `src/master/` (server-rendered UI) and `src/dashboard/client/` (React+Vite) per CLAUDE.md — provenance: analyzer-discovered, trust: high, fetched: 2026-07-13.

## Handoff brief

- **Title:** Frontend Flow (custom composer flow) · **Type:** feat · **Priority:** high · **Tags:** composer, flow, frontend, lovable, authoring.
- **Scope:** Author `custom:frontend` — 4 `task-fe-*` agents cloning the composer-authoring shape: an analyzer (entry, 2 subagents: surface/spec resolver + component-reuse scout) that reads code + the Lovable app via the Lovable MCP and resolves master-UI vs dashboard-UI + new/rework; a taskmaster that creates and changes the spec into subtasks + checklist; an implementer+fixer that builds with FE quality discipline (perf/WCAG/focus/semantic HTML/CSS) and ticks all boxes; and a dual AI-then-human reviewer (2 AI subagents). Lovable MCP = remote HTTP OAuth (`https://mcp.lovable.dev`, no secret), added to the flow install with `activity`. Reuse built-in shared modules; author everything else as `custom:`. Harness Claude + Cursor.
