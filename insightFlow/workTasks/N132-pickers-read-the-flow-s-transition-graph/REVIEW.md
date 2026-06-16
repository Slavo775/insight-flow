# N132 — Pickers read the flow's transition graph — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`next` orders by the task's flow: custom-status flows by their declared status
index (non-terminal statuses are actionable), default/canonical flows keep
`STATUS_WEIGHT`. `next-review`/`next-fix` are unchanged — their canonical status
filters already exclude custom statuses, so fully-custom work surfaces through
`next`. The `reason` fallback is flow-aware only for non-canonical statuses
(default still hits the `ready` branch).

## Checklist verification

- [x] Default parity for all three pickers — `picker-flow.test.mjs`.
- [x] Custom-flow tasks picked in declared order; terminal excluded.
- [x] Custom statuses not leaked into review/fix pickers; surfaced by `next`.

## Blockers

None.

## Non-blocking

- **Cross-flow weight comparability:** a custom-flow task at stage index 0 gets stage-weight 0 — the same tier as a default `fix-needed` (weight 0) — with ties broken by priority/createdAt. Spec-compliant ("ordered within its own flow", mixed coherent), but a custom flow's first stage is effectively as urgent as a default blocker. If that surprises users, a per-flow offset could separate the scales.
- `next-review`/`next-fix` remaining canonical means a custom flow with review-like stages won't use those pickers — acceptable and disclosed.

## Security & edge cases

- `loadFlows()` is fail-soft (empty map on error → canonical weights). `isCustomStatusFlow` keys off "declares any non-canonical status", so a custom flow reusing only canonical statuses behaves canonically — consistent with N131.

## Notes

Aligns with N105/N118 suggestion surfacing. Depends on N128/N131.
