# N186 — Extend flow/statuses.md with custom statuses and state aliases — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-25
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Single-file edit to `flow/statuses.md`: reframed the canonical table as the
**default flow's** statuses and added a "Custom statuses & state aliases" section
distinguishing the two mechanisms. Docs-only, low risk. Verified against the
schema. Approving.

## Checklist verification

- [x] Canonical table reframed as the default flow's statuses — pass
- [x] Two mechanisms covered correctly — pass:
  - `statuses[]` (N128) fields `id` / `title` / `color` / `terminal` match `FlowStatusSchema` (`schema/index.ts:511-516`); empty ⇒ canonical fallback noted
  - `states[]` (N112) `mapsTo` a canonical status matches `ProjectStateSchema` (`schema/index.ts:497-502`); `resolveTrigger` alias→canonical noted
- [x] Terminal coverage strengthened (the `terminal` flag is a property of a status) — pass
- [x] Cross-links `../guides/custom-flow.md` + `../concepts/flows.md` resolve; in-page anchor `#custom-statuses--state-aliases` resolves (no broken-anchor warnings) — pass
- [x] Handovers/relationships not duplicated; docs-only — pass

## Quality gates

- [x] `pnpm --dir website build` clean (zero broken-link/anchor warnings)
- [x] prettier clean

## Notes

- The implementer caught and fixed a `name` → `title` field error before review
  (the schema field is `title`); re-verified correct.
- Part of the docs program; ships with the N181–N187 batch.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-25
**Verdict:** approved

> "done ship all this documentations all tasks"

### Blockers

None.

### Notes

Approved for merge as part of the full documentation batch (N181–N187). Handing to `/task-git` to ship.
