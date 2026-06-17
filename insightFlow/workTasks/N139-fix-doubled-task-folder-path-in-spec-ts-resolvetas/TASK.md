# N139 — Fix doubled task-folder path in spec.ts resolveTaskFolder

**Type:** fix
**Priority:** high
**Created:** 2026-06-17

## Problem

- `packages/taskflow/src/core/spec.ts` has its own `resolveTaskFolder` whose tail computation, `task.folder.replace(/^.*?\//, "")`, strips only the **first** path segment. Under the N101 `insightFlow/workTasks/` layout `task.folder` is e.g. `insightFlow/workTasks/N137-…`, so the tail becomes `workTasks/N137-…` and `resolve(workDir="insightFlow/workTasks", tail)` produces a **doubled** path `insightFlow/workTasks/workTasks/N137-…`. This silently breaks both `spec.ts` consumers: `loadSpec` (so `insight-flow show --id Nxx --spec` returns `taskMd: null` / `checklistMd: null` even though the files exist) and `scaffoldReviewMd` (which `mkdir`s + writes `REVIEW.md` into the stray doubled folder). `storage.ts`'s separate, correct `resolveTaskFolder` uses the basename, so `reviews.json`/`incidents.json` resolve correctly — the two copies have drifted.

## Goal

1. `spec.ts`'s `resolveTaskFolder` resolves to the correct single-nested folder (`<workDir>/<basename>`), matching `storage.ts`.
2. `insight-flow show --id Nxx --spec` returns the actual TASK.md / CHECKLIST.md content under the `insightFlow/workTasks/` layout.
3. `review-start` (and human/change review scaffolds) write `REVIEW.md` to `insightFlow/workTasks/Nxx-…/REVIEW.md`, not a doubled path.
4. A regression test pins the resolution under the `insightFlow/` layout so this can't silently regress again.

## Scope

### In scope

- `packages/taskflow/src/core/spec.ts` — the `tail` computation in `resolveTaskFolder` (line ~14).
- A regression test (`packages/taskflow/test/*.test.mjs`) covering `loadSpec` + `scaffoldReviewMd` under a config whose `workDir` resolves to `insightFlow/workTasks` and a task whose `folder` is `insightFlow/workTasks/Nxx-…`.

### Out of scope

- `storage.ts`'s `resolveTaskFolder` — already correct, leave it.
- Unifying the two `resolveTaskFolder` copies into one shared function (the root maintainability cause) — deferred by decision; tracked as a follow-up in Notes. This task is the minimal fix + guard.
- Auto-cleanup/migration of stray `insightFlow/workTasks/workTasks/` folders already created in existing projects — document manual cleanup; no migration code here.

## Implementation plan

1. **Fix the tail computation.** In `packages/taskflow/src/core/spec.ts` `resolveTaskFolder`, replace:
   - `const tail = task.folder.replace(/^.*?\//, "");`
   - with a basename extraction matching `storage.ts`: `const tail = task.folder.split(/[\\/]/).filter(Boolean).pop() ?? task.folder;`
2. **Regression test.** Add a test that, with a temp project whose resolved `workDir` is `insightFlow/workTasks` and a `task.folder = "insightFlow/workTasks/N99-x"`:
   - `scaffoldReviewMd` creates `<root>/insightFlow/workTasks/N99-x/REVIEW.md` and **no** `…/workTasks/workTasks/…`.
   - `loadSpec` returns the TASK.md / CHECKLIST.md written at the single-nested path (non-null).
3. **Confirm the legacy layout still resolves.** A `task.folder = "workTasks/N00-x"` with `workDir = "workTasks"` must still resolve to `workTasks/N00-x` (basename logic handles both).

## Verification

- `pnpm --dir packages/taskflow run build` then `insight-flow show --id N137 --spec` returns non-null `taskMd`/`checklistMd` (currently null).
- `insight-flow review-start --id <task> --type ai` writes `insightFlow/workTasks/<task>/REVIEW.md` (no `workTasks/workTasks/`).
- New regression test passes; `pnpm --dir packages/taskflow test` stays green (modulo the known-flaky `master-boot`).
- `pnpm typecheck`, `lint`, `format:check` pass.

## Notes

- Dormant under the legacy `workTasks/` layout (one segment + basename → strip-first gave the basename). The **N101 layout migration** (`insightFlow/workTasks/`) added a leading segment and silently triggered the doubling — hence the "after layout changes" smell.
- Root maintainability cause: two divergent `resolveTaskFolder` (`storage.ts` `(cwd, config, task)` vs `spec.ts` `(config, task, cwd)`). Recommended **follow-up**: collapse to one shared resolver to prevent future drift.
- Discovered during the N137/N138 (PR #102) review + human-review flow, which created the stray `insightFlow/workTasks/workTasks/N137|N138/REVIEW.md` (removed before commit).
