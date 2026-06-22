# N166 — Terminal done nodes in flows with status-transition edges and multiple outcomes

**Type:** feat
**Priority:** high
**Created:** 2026-06-22

## Problem

Flows have start points (`entryAgents`, ★) but no terminal/"done" node — nowhere a flow visibly ends and no completion semantics. The user wants terminal circle nodes, agent→terminal edges that carry a status transition, and multiple terminal outcomes ("more ways to done"), where marking done is one option among handoffs.

## Goal

1. Add a terminal node type to the flow schema + React Flow viz (rendered as a circle).
2. Agent→terminal edges carry a status transition, reusing the existing status-change edge model.
3. Support multiple terminal nodes per flow.
4. Provide a migration for existing Project JSON.

## Scope

### In scope

- Flow schema: `packages/taskflow/src/core/schema/index.ts`, `core/types.ts`, `core/flow-status.ts` — terminal node representation (e.g. `Project.terminals[]` with id/label/status).
- `components/FlowEditor.tsx` + `components/FlowMap.tsx` — author/render terminal nodes and edges into them.
- Migration for existing project definitions.

### Out of scope

- Injecting the "mark done vs hand off" rule into agent prompts (scoped follow-up).
- Default-flow resolution changes (N167), though both feed flow resolution.

## Implementation plan

1. **Schema** — add a terminal node type (id, label, status) to the Project schema; validate via Zod.
2. **Editor** — in `FlowEditor`, allow adding terminal nodes and drawing agent→terminal edges; reuse the status trigger picker (`TASK_STATUSES` / flow statuses) for the carried transition.
3. **Map render** — in `FlowMap`, render terminals as circles, positioned to the right (composes with N163 LTR layout).
4. **Multiple terminals** — support N terminals with distinct outcomes (done / handed-off / rejected).
5. **Migration** — backfill/normalize existing Project JSON so older flows load without terminals.

## Verification

- `pnpm --dir packages/taskflow run build` + `test` pass (schema/migration tests).
- Manual: `pnpm play` → add two terminal nodes to a flow, connect an agent to each with different status transitions; reload to confirm persistence + migration.

## Notes

- Confirmed: multiple terminal nodes. Existing model: `entryAgents`, `states`, `statuses`, handover (auto/gated) + status-change edges (N150). See ANALYSIS.md. Related: N167; the prompt-rule injection is a separate follow-up.
