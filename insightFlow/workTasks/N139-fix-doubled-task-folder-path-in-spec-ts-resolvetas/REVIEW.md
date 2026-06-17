# N139 — Fix doubled task-folder path in spec.ts resolveTaskFolder — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet)
**Verdict:** approved

## Summary

One-line root-cause fix in `core/spec.ts` `resolveTaskFolder`: derive the folder from the **basename** of `task.folder` (`split(/[\\/]/).filter(Boolean).pop() ?? task.folder`) instead of `replace(/^.*?\//, "")`, matching `storage.ts`. Plus a 3-case regression test and exporting `loadSpec`/`scaffoldReviewMd` for it. Low risk — the change only affects how the (previously doubled) path is computed; nothing legitimately depended on the doubled path. Dogfood proof: this review's own `review-start` (run via the fixed local build) scaffolded `REVIEW.md` at the correct single-nested path with no `workTasks/workTasks/`.

## Checklist verification

- [x] `spec.ts` `resolveTaskFolder` derives from the basename of `task.folder` — `spec.ts:20`, identical logic to `storage.ts:154`. **pass**
- [x] `show --id Nxx --spec` returns non-null TASK.md/CHECKLIST.md under the `insightFlow/` layout — verified via the local built CLI (`taskMd`/`checklistMd` present; was null). **pass**
- [x] `review-start` scaffolds `REVIEW.md` at the single-nested path — confirmed live this run. **pass**
- [x] Legacy `workTasks/` layout still resolves — covered by the third test case. **pass**
- [x] Regression test added — `test/spec-path.test.mjs` (3 cases; the insightFlow cases fail on pre-fix code). **pass**

## Non-blocking

1. The two `resolveTaskFolder` copies (`storage.ts` `(cwd, config, task)` and `spec.ts` `(config, task, cwd)`) still both exist — the drift that caused this. DRY unification was intentionally deferred (minimal-fix decision); worth a follow-up task so it can't diverge again.
2. Pre-existing stray `insightFlow/workTasks/workTasks/` dirs in already-affected projects are not auto-cleaned (out of scope, documented). One-off manual `rm` per project.
3. `index.ts` now exports `scaffoldReviewMd` (slightly more public surface) — acceptable for testability; it's a stable function.

## Security & edge cases

- The basename approach is strictly *safer* than the old one: it yields the last path segment of a tracker-managed folder, so it can't carry parent segments or traverse outside `workDir`. `task.folder` originates from `insight-flow create` (slugified), not arbitrary input.
- Handles trailing slash (`filter(Boolean)`), Windows separators (`[\\/]`), and the degenerate empty folder (falls back to `task.folder` → resolves to `workDir`).

## Notes

- The stale **global** `insight-flow` binary still reproduces the bug (`show --spec` → null) — it ships the pre-fix code. After this lands + a release, `npm i -g insight-flow` (or re-yalc) is needed for the CLI to pick it up. Not a code issue.
- Follow-up candidate: collapse the two `resolveTaskFolder` into one shared resolver (the root maintainability cause).
- Surfaced via the N137/N138 (#102) review flow; see this task's ANALYSIS.md.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-17
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None (the two AI-review follow-ups — DRY the resolvers, clean stray dirs — remain optional, not blockers).

### Notes

- _"please approved done create or via gh and merge it"_ — approved; landed via PR merged to `main`.
