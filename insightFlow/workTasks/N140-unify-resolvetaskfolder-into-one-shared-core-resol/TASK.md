# N140 — Unify resolveTaskFolder into one shared core resolver

**Type:** rework
**Priority:** medium
**Created:** 2026-06-17

## Problem

- Two divergent copies of `resolveTaskFolder` exist in `core/`: `storage.ts:152` `resolveTaskFolder(cwd, config, task)` and `spec.ts:12` `resolveTaskFolder(config, task, cwd?)` — different argument order, duplicated body. They already drifted once: under the N101 `insightFlow/workTasks/` layout the `spec.ts` copy produced a doubled path (`insightFlow/workTasks/workTasks/Nxx`), the N139 bug. N139 fixed the symptom by copying `storage.ts`'s basename logic into `spec.ts`, leaving two identical-but-separate functions that can silently diverge again.

## Goal

1. A single `resolveTaskFolder` lives in `core/` (next to `getWorkDir`), exported once, with one canonical signature.
2. `storage.ts` and `spec.ts` both call the shared resolver; no local copy remains in either file.
3. Behavior is unchanged for both the `insightFlow/workTasks/` and legacy `workTasks/` layouts (pure refactor — no functional change).
4. The N139 regression test exercises the shared function so the drift class cannot return.

## Scope

### In scope

- Add the shared resolver to `core/` alongside `getWorkDir` (likely `core/paths.ts`; implementer picks the home consistent with existing core layout). Canonical signature: `resolveTaskFolder(config: TaskflowConfig, task: Task, cwd?: string)` (matches the `spec.ts` form so its 2 call sites are unchanged).
- `core/storage.ts`: delete the local copy (line ~152); update its 4 call sites (`storage.ts:159,163,183,209`) to the canonical arg order.
- `core/spec.ts`: delete the local copy (line ~12); import the shared resolver; call sites `spec.ts:42,67` already match.
- `packages/taskflow/test/spec-path.test.mjs`: re-point at / extend to assert the shared function, keeping both the `insightFlow/workTasks/` and legacy `workTasks/` layout cases.

### Out of scope

- Any change to the basename resolution logic itself — it is correct post-N139; this only de-duplicates.
- Stray doubled `insightFlow/workTasks/workTasks/` directory cleanup — separate task (N141).
- Changing `getWorkDir` or the public `index.ts` surface beyond what's needed to export the shared resolver.

## Implementation plan

1. **Add shared resolver to core.** Place `resolveTaskFolder(config, task, cwd?)` in `core/paths.ts` (or the file housing `getWorkDir`); body = the current basename logic: `const tail = task.folder.split(/[\\/]/).filter(Boolean).pop() ?? task.folder; return resolve(getWorkDir(config, cwd), tail);`.
2. **Migrate `spec.ts`.** Remove the local `resolveTaskFolder` (lines ~8–21); import the shared one. Confirm `spec.ts:42,67` compile unchanged.
3. **Migrate `storage.ts`.** Remove the local `resolveTaskFolder` (line ~152); import the shared one; update the 4 call sites (`159,163,183,209`) from `(cwd, config, task)` to `(config, task, cwd)`.
4. **Update the regression test.** In `test/spec-path.test.mjs`, exercise the shared function (or keep going through `loadSpec`/`scaffoldReviewMd`, which now route through it); keep the `insightFlow/` doubled-path guard and the legacy `workTasks/` case.
5. **Verify zero behavior change.** Build + run the full suite; spot-check `insight-flow show --id N137 --spec` returns non-null and `review-start` writes to the single-nested path.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `pnpm --dir packages/taskflow test` is green (230/230, modulo the known-flaky `master-boot`).
- `grep -rn "function resolveTaskFolder" packages/taskflow/src` returns exactly one definition.
- `insight-flow show --id N137 --spec` returns non-null `taskMd`/`checklistMd`; `review-start` writes `insightFlow/workTasks/<task>/REVIEW.md` (no `workTasks/workTasks/`).
- `pnpm typecheck`, `lint`, `format:check` pass.

## Notes

- Follow-up #1 from the N139 review — REVIEW.md non-blocking item: *"collapse the two resolveTaskFolder into one shared resolver (the root maintainability cause)."* See `insightFlow/workTasks/N139-fix-doubled-task-folder-path-in-spec-ts-resolvetas/REVIEW.md` and this folder's `ANALYSIS.md`.
- Sibling task N141 handles the stray-directory cleanup (the other N139 follow-up). N140 and N141 are independent and can land in any order.
