# N198 — Authoring flow documentation — overview, walkthrough, agents & subagents reference

**Type:** docs
**Priority:** medium
**Created:** 2026-06-29
**Tags:** docs, composer, authoring

## Problem

The authoring flow (`composer-authoring`, shipped in N194–N197) — a guided
lifecycle for building custom modules/agents/flows — is effectively undocumented.
The building blocks have docs (`concepts/`, `composer-mcp/`, `subagents/`), but
nothing ties them together into the narrative a user follows to actually author a
customization. `describe` was the only thing documented (N196).

## Goal

A small, drift-resistant **"Authoring" docs section** that gives a user the intro,
the how-to, and a reference for the agents — without duplicating the concept docs
or transcribing the (frequently-changing) 20 agent/subagent prompts.

## Scope

### In scope — a dedicated `website/docs/authoring/` section, 3 pages + category

1. **Overview / purpose** (explanation) — what the authoring flow is, what the
   user gets, when to use the flow vs. the dashboard/MCP directly. Links out to
   `concepts/` (modules/agents/flows/handover) rather than re-explaining them.
2. **Walkthrough** (how-to) — install the flow → start at `task-authoring-analyze`
   → the lifecycle (gated analyze-first → create → implement → review → fix →
   human-review → test → install-after-approval) → a **worked example: author a
   custom module** end-to-end (analyze/dedup → author → review → install).
3. **Agents & subagents reference** — compact tables: the 8 agents
   (purpose · what it does · what it doesn't) + the 4×3 subagent matrix
   (analyst/author/reviewer × module/agent/flow/relationship) + the reuse-first
   policy. Points to the **dashboard composition map** and the **`describe` tool**
   for always-current detail.

- `_category_.json` + sensible sidebar placement (near `composer-mcp/` /
  `subagents/`).
- Cross-links to `composer-mcp/`, `subagents/`, `concepts/`.

### Out of scope

- Source/behaviour changes (purely additive website content).
- Transcribing the 20 agent/subagent prompts (use tables + live links — the
  defining anti-staleness decision).
- Auto-generating docs from the registry (possible later; not now).
- The existing `subagents/` page rewrite (link to it; light touch only if needed).

## Implementation plan

1. Scaffold `website/docs/authoring/` + `_category_.json`.
2. Write the 3 pages per the structure above; embed the worked example.
3. Cross-link to/from `composer-mcp/`, `subagents/`, `concepts/`; add a pointer
   from `composer-mcp/index.md` (which currently holds the only authoring note).
4. Verify against the live registry (agent/subagent names, the lifecycle, the
   reuse rule, `describe`) so the tables are accurate at write time.
5. `pnpm --dir website build` green; check sidebar + internal links.

## Verification

- `website/docs/authoring/` renders: Overview, Walkthrough (with the worked
  example), Agents & subagents reference.
- Tables match the shipped agents/subagents; reuse-first policy + `describe`
  referenced; links to dashboard/`describe` for live detail.
- `pnpm --dir website build` passes; no broken links.

## Notes

- Decision trail + the staleness rationale: this folder's `ANALYSIS.md`.
- Documents the N194–N197 initiative (flow + agents + per-kind subagents + reuse
  policy + `describe`). Source already on `feat/authoring-flow` (committed `bf91837`).
- Drift-resistance is the core constraint: tables + live links, never prompt
  transcription.
