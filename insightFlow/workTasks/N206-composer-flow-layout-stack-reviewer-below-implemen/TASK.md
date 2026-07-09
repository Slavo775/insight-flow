# N206 — Composer flow layout — stack reviewer below implementer in the flow map

**Type:** feat
**Priority:** low
**Created:** 2026-07-09

## Problem

The `composer-authoring` flow has no saved `layout`, so the dashboard flow map draws its 5 agents as a straight horizontal line. The human wants the **Composer Reviewer** stacked **directly below the Composer Implementer** (per a screenshot) so the implement↔review loop is clear and the map is compact. Cosmetic only — no behaviour/prompt/edge/agent change. See `ANALYSIS.md`.

## Goal

1. Add a `layout` field to `project/authoring.json` placing `authoring-review` directly below `authoring-implement`, the other agents in a row.
2. Ship it as the built-in default; the map renders stacked for every consumer.

## Scope

### In scope

- `packages/taskflow/src/agents/project/authoring.json` — add a top-level `layout` object (agent/terminal id → `{ x, y }`).

### Out of scope

- Any agent, edge, handover, status, or prompt change (the flow's behaviour is untouched).
- The dashboard client code (`FlowMap.tsx` / `FlowEditor.tsx` already consume `layout`).
- Other flows.

## Implementation plan

1. **Add the `layout` field.** In `project/authoring.json`, add (alongside `install`/`statuses`/`entryAgents`):
   ```json
   "layout": {
     "authoring-analyze":   { "x": 0,    "y": 0 },
     "authoring-create":    { "x": 280,  "y": 0 },
     "authoring-implement": { "x": 560,  "y": 0 },
     "authoring-review":    { "x": 560,  "y": 190 },
     "authoring-install":   { "x": 840,  "y": 0 },
     "done":                { "x": 1120, "y": 0 }
   }
   ```
   Grid: columns 280px apart, rows 110px (matches `COL_W`/`ROW_H`); `review` at `y: 190` sits directly under `implement` with a clear gap.
2. **Validate.** Ensure the JSON parses and the flow loads via the schema (the `layout` field is an optional `z.record(string, {x,y})`).

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` → all pass (a `layout` field is schema-optional; no structural test should break).
- Loader: `BUILTIN_PROJECTS["composer-authoring"].layout` present; `authoring-review` x === `authoring-implement` x and `authoring-review` y > `authoring-implement` y (review sits below implement).
- No change to `agents`, `flow` edges, `statuses` ids, or any agent prompt.
- (Manual) In the dashboard flow map, the Reviewer renders directly below the Implementer, matching the screenshot.

## Notes

- Cosmetic follow-up to the composer-v2 series (N200–N205). Stacked on `feat/N205-composer-flow-polish` (both touch `project/authoring.json`, and N205 isn't merged yet); merge into `agents-approved`.
- Coordinates are adjustable — easy to nudge review's position if the human wants it lower/left/right.
- The `layout` field is purely a dashboard-render hint; absent entries fall back to auto-layout, so it can never break the flow.
