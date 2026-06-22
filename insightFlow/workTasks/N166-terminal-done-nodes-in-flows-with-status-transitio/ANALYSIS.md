# N166 — Terminal done nodes in flows with status-transition edges — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- Symptom: a flow has **start points** (`entryAgents`, rendered with a ★ in `FlowMap`) but no terminal / "done" node. There's nowhere a flow visibly *ends*, and no completion semantics.
- Desired: a terminal **circle node** representing stop/done; an agent can have a relationship into a terminal that carries a **status transition**; **multiple terminal outcomes** are allowed (e.g. done / handed-off / rejected) — "more ways to done". Separately, agents should carry a prompt rule: *"if everything is OK, transition to done; otherwise move the ticket to a state another agent picks up"* — where **done is one option** among handoffs, not the only one.

## Goal

1. New **terminal node** type in the flow schema + React Flow rendering (circle).
2. Edges from an agent into a terminal carry a status transition (reuse the existing status-change edge model).
3. Support **multiple** terminal nodes per flow.
4. (Likely follow-up) inject the "mark done vs hand off" rule into agent prompts.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Multiple terminal nodes | Matches "more ways to done"; flexible outcomes | Schema + migration + viz | M–L |
| B — Single done node, many edges in | Simplest schema | Can't express distinct outcomes | M |
| C — Terminals + prompt-rule injection in one task | Complete in one go | Couples viz to prompt generation; large blast radius | L |

## Decision

- Chosen option: **A** (confirmed by user: multiple terminal nodes).
- Rationale: gives distinct outcomes the user wants. Keep the prompt-rule injection as a scoped follow-up so the schema/viz lands cleanly first.

## Open questions

- `[blocking]` Schema shape & migration: add `Project.terminals[]` (id/label/status) plus edges agent→terminal as status-change edges? Existing project JSON needs a migration path.
- `[non-blocking]` Does the agent prompt-rule injection belong here or in a dedicated follow-up task? Recommend: model + viz here, prompt injection separate.
- `[non-blocking]` Interaction with N167 (entry + terminal both feed flow resolution).

## Sources

- `components/FlowEditor.tsx` (entryAgents, states/statuses, handover/status-change edges), `components/FlowMap.tsx`, `core/flow-status.ts`, `core/statuses.ts` — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Terminal done nodes in flows with status-transition edges and multiple outcomes · type: feat · priority: high. Add a terminal node type (multiple per flow) to the flow schema and React Flow viz; agent→terminal edges carry a status transition reusing the existing status-change edge model. Prompt-rule injection ("mark done vs hand off") is a scoped follow-up. Needs a migration for existing Project JSON. Related: N167.
