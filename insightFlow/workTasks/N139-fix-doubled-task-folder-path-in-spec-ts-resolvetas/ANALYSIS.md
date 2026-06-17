# N139 — Analysis

## Problem framing

After the N137/N138 (#102) review flow, `insight-flow review-start` created `REVIEW.md` under a doubled `insightFlow/workTasks/workTasks/N1xx/` path. Initial hypothesis was a stale global binary ("reinstall after layout changes"). Investigation disproved that: it is a genuine bug in the current source, and it affects more than REVIEW.md.

## Goal

`spec.ts`'s task-folder resolution returns the correct single-nested folder under the `insightFlow/workTasks/` layout, restoring `show --spec` and `review-start` REVIEW.md placement, with a regression test guarding it.

## Options considered

1. **Minimal one-line fix + regression test (chosen).** Change `spec.ts:14` tail computation from `replace(/^.*?\//, "")` (strip first segment) to a basename extraction matching `storage.ts`. Smallest, safe; add a layout regression test.
2. **DRY unification.** Delete `spec.ts`'s local `resolveTaskFolder` and import the single resolver from `storage.ts`/`paths.ts`. Addresses the root cause (two copies drifted) but larger and needs an import-cycle check. Deferred per decision (kept as a follow-up note).
3. **Do nothing / reinstall binary.** Rejected — the bug is in shipped code; reinstalling can't fix it.

## Decision

Option 1: minimal basename fix in `spec.ts` + a regression test under the `insightFlow/` layout. Type `fix`, priority high (it silently empties `show --spec` for the reviewer/implementer flow). Root-cause DRY unification recorded as a follow-up.

## Open questions

- Should the fix also delete pre-existing stray `insightFlow/workTasks/workTasks/` dirs in consumer projects? Current decision: no migration; document manual cleanup.
- Follow-up: do we want the DRY unification as its own task?

## Sources

- `packages/taskflow/src/core/spec.ts:12-16` — buggy `resolveTaskFolder` (`tail = task.folder.replace(/^.*?\//, "")`).
- `packages/taskflow/src/core/storage.ts:152-156` — correct `resolveTaskFolder` (`tail = …split('/').filter(Boolean).pop()`).
- Confirmed symptom: `insight-flow show --id N137 --spec` → `taskMd: null`, `checklistMd: null` (files exist at the single-nested path).
- Observed cruft: `insightFlow/workTasks/workTasks/N137|N138/REVIEW.md` (removed during the #102 land).
- Trigger: N101 `insightFlow/workTasks/` layout migration (added a leading path segment).

## Handoff brief

fix / high priority / tags: bug, paths, layout, cli. One-line basename fix in `core/spec.ts` `resolveTaskFolder` to match `storage.ts`, plus a regression test for `loadSpec` + `scaffoldReviewMd` under the `insightFlow/workTasks/` layout (and a legacy-layout assertion). Out of scope: storage.ts (correct), DRY unification (follow-up), stray-folder migration.
