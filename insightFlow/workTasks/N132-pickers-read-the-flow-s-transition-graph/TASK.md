# N132 — Pickers read the flow's transition graph

**Type:** rework
**Priority:** medium
**Created:** 2026-06-15

## Problem

- The pickers (`next`/`next-review`/`next-fix`) use a hardcoded `STATUS_WEIGHT` + canonical status filters (`query.ts`). For custom-flow tasks they should pick by the flow's own transition order, while the default flow reproduces today's ordering exactly.

## Goal

1. `next`/`next-review`/`next-fix` derive the 'actionable' set + ordering from the **task's flow transition graph** for flow-bound tasks (retire `STATUS_WEIGHT` for those).
2. The **default flow reproduces today's ordering byte-for-byte** (the canonical weights are expressed as the default flow's graph).
3. Mixed workspaces (default + custom flows) pick coherently — each task ordered within its own flow.
4. The N105/N118 suggestion surfacing already reads the flow — this aligns the pickers with it.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/query.ts` — replace the hardcoded weights with flow-graph-derived actionability/order for flow-bound tasks; default-flow fallback reproduces current weights.
- Tests: default-only `next`/`next-review`/`next-fix` identical to today; a custom-flow task is picked per its graph; mixed ordering coherent.

### Out of scope

- The status setter (N131). Prompt wording (N133). Suggestion engine (already N105/N118).
- Changing the default flow's effective order.

## Implementation plan

1. **Order from graph** — for a task's flow, derive stage order from its transition edges; weight accordingly.
2. **Default parity** — encode/verify the default flow's graph yields today's `STATUS_WEIGHT` order.
3. **Tests** — default parity (all three pickers) + custom order + mixed.

## Verification

- `pnpm build` + suite green; existing picker tests unchanged (default parity).
- A custom-flow task is picked in its flow's order; default-only behavior identical.

## Notes

- Depends on N131 (+ N128). Aligns pickers with N105/N118. See N119/ANALYSIS.md.
- Default parity is the safety bar.
