# N196 — Authoring subagents (lean) — composer-analyst/author/reviewer + dedup & best-practice

**Type:** feat
**Priority:** medium
**Created:** 2026-06-26

## Problem

The authoring agents (N195) should **fan out** to specialized subagents for the per-stage heavy lifting — inventorying existing defs (to avoid duplicates / promote reuse), authoring each artifact kind, and reviewing the result. Per the decision, **start lean** (broad subagents) and split per-kind later only if a kind proves complex.

## Goal

1. Ship a **lean** set of built-in `subagent` modules for the authoring flow.
2. Wire them onto the N195 agents via their `subagents` field (N191).
3. Bake in **dedup/reuse** (query the composer MCP for existing defs) and **best-practice** guidance.

## Scope

### In scope

- **3 broad subagents** (built-in `subagent` modules, `tools` scoped appropriately):
  - **`composer-analyst`** — read-only. Inventories existing modules/agents/flows (via the composer MCP `list`/`get`) to find reuse candidates and flag duplicates; reads the codebase for context; reports a design brief. (Used by **analyze** + **review**.)
  - **`composer-author`** — authors the JSON defs (calls composer MCP `create_module/create_agent/create_flow`, incl. handovers/relationships). (Used by **implement**.)
  - **`composer-reviewer`** — read-only. Validates authored defs against schema, dedup/reuse, and best-practice conventions; returns findings. (Used by **review**.)
- **Dedup/reuse logic** — `composer-analyst`/`composer-reviewer` prompts explicitly: before creating, check the merged registry for an existing def that satisfies the intent; prefer reuse/extension over duplication.
- **Best-practice guidance** — encode authoring conventions (id naming `custom:*`, baseline modules, locked-kind awareness, handover `when`, etc.) in the subagent prompts.
- **Wire onto N195 agents** — set the `subagents` field on analyze/implement/review (and others as useful).

### Out of scope

- Per-kind subagents (module-/agent-/flow-/handover-specific) — a later split if a kind proves deep (start lean).
- The agents themselves (N195) and the flow (N194).
- MCP install module (N197).

## Implementation plan

1. **Author the 3 subagent modules** (`src/agents/modules/integrations/composer-subagents.json` or similar); register in `MODULE_REGISTRY`.
2. **Dedup/reuse + best-practice** content in their `content` prompts (analyst/reviewer query the MCP; author follows conventions).
3. **Wire** them onto the N195 agents' `subagents` arrays.
4. **Tests** — subagents resolve + emit (`.claude/agents/*`); installing an authoring agent emits its subagents; reference-safe.

## Verification

- The 3 subagents exist in the registry, install to `.claude/agents/`, and are referenced by the authoring agents (visible on the agent detail view).
- Installing the authoring flow/agents emits the subagents reference-safely.
- `pnpm --dir packages/taskflow test` + `tsc` + `lint` green.

## Notes

- Depends on **N195** (agents to wire onto) and **N190/N191** (subagent kind + orchestrator field, shipped).
- "How many" decision: **start with 3 broad**; revisit per-kind (~10) only if justified.
- Decision trail: this folder's `ANALYSIS.md` + N194's.
