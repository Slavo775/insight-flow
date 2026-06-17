# N139 — Fix doubled task-folder path in spec.ts resolveTaskFolder — Checklist

## Done criteria

- [ ] `spec.ts` `resolveTaskFolder` derives the folder from the basename of `task.folder` (matches `storage.ts`).
- [ ] `insight-flow show --id Nxx --spec` returns non-null TASK.md / CHECKLIST.md under the `insightFlow/workTasks/` layout.
- [ ] `review-start` scaffolds `REVIEW.md` at `insightFlow/workTasks/Nxx-…/REVIEW.md` (no doubled `workTasks/workTasks/`).
- [ ] Legacy `workTasks/` layout still resolves correctly.
- [ ] Regression test added for `loadSpec` + `scaffoldReviewMd` under the `insightFlow/` layout.

## Quality gates

- [ ] `pnpm typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` passes
- [ ] `pnpm --dir packages/taskflow format:check` passes
- [ ] `pnpm --dir packages/taskflow test` passes (new regression test included)

## Verification

- [ ] After build, `insight-flow show --id N137 --spec` shows the real spec content; `review-start` writes REVIEW.md to the single-nested path.
