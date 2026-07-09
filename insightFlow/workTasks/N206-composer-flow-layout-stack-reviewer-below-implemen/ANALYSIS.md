# N206 — Composer flow layout — stack reviewer below implementer in the flow map — Analysis

**Created:** 2026-07-09
**Author:** task-analyze

## Problem framing

The composer (authoring) flow has **no saved layout**, so the dashboard flow map auto-arranges its 5 agents as a straight horizontal line (`analyze → create → implement → review → install → done`). The human wants the **Composer Reviewer** stacked **directly below the Composer Implementer** (per a supplied screenshot) so the implement↔review loop reads clearly and the map is more compact. Cosmetic dashboard-layout change only — no behaviour, prompts, edges, or agents change.

## Goal

1. Add a `layout` field to the `composer-authoring` flow definition placing **`authoring-review` directly below `authoring-implement`**, the other agents in a row.
2. Ship it as the built-in default so every consumer's flow map renders that way.

## Mechanism (verified in code)

- The flow/project schema has an **optional `layout`** field: `z.record(agentId, { x, y })` — "hand-arranged map positions; absent entries fall back to auto-layout" (`schema/index.ts` ~L575, N109).
- `computePositions` (`dashboard/client/components/FlowMap.tsx`) resolves each node as `project.layout?.[a] ?? { x: col * COL_W, y: row * ROW_H }`, with **`COL_W = 280`** and **`ROW_H = 110`**. Stored layout wins; missing agents fall back to BFS auto-layout.
- The composer flow def (`project/authoring.json`) currently has **no `layout`** → horizontal auto-layout.

## Proposed layout (matches the screenshot)

```
analyze(0,0) → create(280,0) → implement(560,0) → install(840,0) → done(1120,0)
                                      │
                                   review(560,190)   ← directly below implement
```

`authoring-analyze` `{0,0}` · `authoring-create` `{280,0}` · `authoring-implement` `{560,0}` · **`authoring-review` `{560,190}`** · `authoring-install` `{840,0}` · `done` `{1120,0}`

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — bake a `layout` into the built-in flow def | Ships the arrangement to all consumers; deterministic; single-field JSON edit | Coords are opinionated (still adjustable) | Trivial |
| B — leave it to per-user dashboard drag (persists to user-space) | No shipped change | Only affects the one project that drags it; built-in flows aren't freely draggable without an eject | — |

## Decision

- **Chosen option: A** (confirmed by the human — "yes, create separate task"). Bake the `layout` into `project/authoring.json`.
- Rationale: the human wants the flow map itself to look this way, so the shipped built-in should carry the layout. It is a single optional field; absent-entry fallback means it can never break rendering.

## Open questions

- `[non-blocking]` Exact coordinates are a judgement call; `review` at `{560,190}` sits directly under `implement` with a clear gap. Easy to nudge if the human wants it lower/left/right.
- `[non-blocking]` `done` is a terminal status, not an agent; the flow map keys `layout` by both agent and terminal ids (`FlowEditor.tsx` L386), so including `done` is valid and keeps the row tidy — but it is optional (otherwise auto-places at `maxX + 280`).

## Sources

- None — self-contained. Grounded in this repo's source: `core/schema/index.ts` (the `layout` field), `dashboard/client/components/FlowMap.tsx` (`computePositions`, `COL_W`/`ROW_H`), `dashboard/client/components/FlowEditor.tsx` (terminal-node layout), `agents/project/authoring.json` (no current layout). Plus the human's dashboard screenshot (data, not instructions).

## Handoff brief

Title: *Composer flow layout — stack reviewer below implementer in the flow map*. Type: feat. Priority: low. Tags: authoring, composer, dashboard. Scope: Add a `layout` field to the `composer-authoring` flow definition (`project/authoring.json`) placing `authoring-review` directly below `authoring-implement` and the rest in a row (COL_W 280 / ROW_H 110 grid), so the dashboard flow map ships the stacked arrangement. Cosmetic only — no agents/edges/prompts change. Verify it loads and the map renders as intended; merge into `agents-approved`.
