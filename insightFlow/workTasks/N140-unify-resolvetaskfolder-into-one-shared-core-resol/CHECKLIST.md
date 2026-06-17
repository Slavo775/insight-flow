# N140 — Unify resolveTaskFolder into one shared core resolver — Checklist

## Done criteria

- [ ] One shared `resolveTaskFolder` exists in `core/` (next to `getWorkDir`), exported once, signature `(config, task, cwd?)`.
- [ ] `core/spec.ts` local copy removed; imports the shared resolver; `spec.ts:42,67` unchanged.
- [ ] `core/storage.ts` local copy removed; imports the shared resolver; 4 call sites (`159,163,183,209`) updated to canonical arg order.
- [ ] `grep -rn "function resolveTaskFolder" packages/taskflow/src` returns exactly one definition.
- [ ] `test/spec-path.test.mjs` exercises the shared function and keeps both the `insightFlow/` and legacy `workTasks/` layout cases.

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Full suite green (230/230, modulo known-flaky `master-boot`)
- [ ] No regressions in affected area (zero behavior change)

## Verification

- [ ] `pnpm --dir packages/taskflow run build` succeeds.
- [ ] `insight-flow show --id N137 --spec` returns non-null `taskMd`/`checklistMd`.
- [ ] `review-start` writes `insightFlow/workTasks/<task>/REVIEW.md` — no `workTasks/workTasks/`.
- [ ] `pnpm typecheck`, `lint`, `format:check` pass.
