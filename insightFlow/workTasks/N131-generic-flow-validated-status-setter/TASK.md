# N131 — Generic flow-validated status setter

**Type:** rework
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Transition commands write fixed canonical statuses (`implement-start` → `in-progress`, `review-end` → `approved`/`fix-needed`, …). For tasks on a custom flow with custom statuses, transitions must be validated against the flow and set the flow's status — without changing the canonical default-flow behavior.

## Goal

1. A generic **flow-validated status setter** that validates a target status against the task's flow transition graph (the flow's `statuses` + `status-transition` modules + edges) before writing `Task.status`.
2. The shipped transition commands (`implement-start`/`-end`, `review-start`/`-end`, `fix-*`, `change-*`, `push`/`merge`/`done`) route through it; for the **default flow** the behavior is **byte-identical** to today.
3. An invalid transition (status not reachable in the task's flow) is rejected with a clear error.
4. `Task.status` validation is relative to the task's flow, not a global enum.

## Scope

### In scope

- `packages/taskflow/src/core/` — `setStatus(task, target, flow)` validating against the flow's transition graph; used by the lifecycle commands.
- `cli/commands/*` lifecycle commands — route status writes through it (default-flow parity preserved).
- Tests: default-flow lifecycle byte-identical; a custom-flow transition to an in-set status succeeds; an out-of-graph transition rejected.

### Out of scope

- Picker ordering (N132). Prompt emission wording (N133). Kanban/styling (N129/N130).
- Changing the canonical lifecycle's statuses or command names.

## Implementation plan

1. **Setter** — resolve the task's flow; validate target ∈ reachable transitions; write + statusHistory.
2. **Route** — lifecycle commands call the setter; default flow yields today's transitions exactly.
3. **Reject** — invalid target → error.
4. **Tests** — default parity + custom transition + rejection.

## Verification

- `pnpm build` + full suite green; every existing lifecycle test passes unchanged (default parity).
- A custom-flow task transitions through its statuses; an illegal transition errors.

## Notes

- The riskiest slice — depends on N128 (+ N119). Pairs with N132/N133. See N119/ANALYSIS.md.
- Default-flow byte-parity is the hard safety requirement.
