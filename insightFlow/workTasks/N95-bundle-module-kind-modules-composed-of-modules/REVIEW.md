# N95 — Bundle module kind — modules composed of modules — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**PR:** https://github.com/Slavo775/insight-flow/pull/72
**Verdict:** approved

## Summary

Bundle module kind (PR #72, `2beac58`): `kind: "bundle"` expands recursively in `resolveModules` at the bundle's declared position; first-wins dedup spans bundle + direct refs; cycles throw with the path named. Reviewed the guard-order subtlety specifically: the cycle check runs **before** the seen-set skip, so a true cycle throws rather than being silently deduped, while diamond shapes (two bundles sharing a child) dedup correctly — both covered by tests. Pilot uses existing data (`testing` bundle over the three siblings), playground def adopts one id with deep-equal artifacts and live-verified idempotency (single hook entry). A real latent bug was caught and fixed in passing: the playground def's stale `events` ref (broken since N94's rename — the file is project-local data, untouched by N94). Verdict: **approved**.

## Checklist verification

- [x] Bundle schema variant (`modules` min 1) — pass
- [x] Recursive expansion at position; cross-form dedup; cycle throws with path — pass (nested-bundle ordering test asserts exact output)
- [x] `testing` bundle ships; playground adopts the single id; identical artifacts — pass (deep-equal + live)
- [x] Dashboard: bundle badge/color (amber), children chips + links, bundle → children map edges (clickable) — pass
- [x] Drift suite untouched; `/api/modules` shape unchanged — pass

## Blockers

None — approved.

## Non-blocking

1. `referencedBy` doesn't count bundle membership (children don't show "contained in: testing") — the ANALYSIS open question, deferred reasonably; revisit when the catalogue grows.
2. The playground-def fix (`events` → `actions`) highlights that project-local defs have no drift guard — expected for user data, but the N96 referential validation pattern could later extend to `--def` files at load (it already throws on unknown ids, which is what surfaced this).

## Security & edge cases

- Cycle guard bounds recursion; bundle ids never reach file paths; no new I/O.

## Notes

- Bundles immediately earned their keep in N96 (`install: ["activity"]`).
- Same-session caveat; human gate on PR #72.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-12
**Verdict:** approved

### Summary

Batch approval of N93–N97 with instruction to merge the full PR stack. Human's exact comment:

> please approved all of this task create invoke task git and merge via gh all 6 mrs

### Blockers

None — approved.

### Notes

- Merged via /task-git as part of the #69→#74 stack.
