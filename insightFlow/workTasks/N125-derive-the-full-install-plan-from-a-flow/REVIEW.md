# N125 — Derive the full install plan from a flow — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`flowArtifacts(flow)` collects mcp/hook/skill contributions from the flow's
agents + its install list; `flowInstallPlan(flow)` flattens them into an
ordered, deduped `InstallStep[]` (mcp → hooks → skills) with stable keys and
display targets. `GET /api/flow-install-plan?id=` returns it (404 for unknown).
Reuses `collectArtifacts`; clean separation (read-only).

## Checklist verification

- [x] Plan unions agent artifacts + install list, deduped/ordered — `custom-defs-api.test.mjs`.
- [x] Endpoint returns the plan; unknown flow → 404.
- [x] Targets are descriptive (.mcp.json / settings.json / skill paths).

## Blockers

None.

## Non-blocking

- Dedup key for hooks is `event:matcher:command`; two hooks differing only by `timeout` would dedup to one plan row (still both applied by the emitter). Cosmetic only.

## Security & edge cases

- Read-only; no writes. Synthetic install "agent" id is namespaced (`<flow>:install`) to avoid collision.

## Notes

Feeds N126 (execution) and N127 (UI).
