# N07 — Add Zod schema validation to taskflow storage layer — Checklist

## Done criteria

- [ ] `zod` added as a dependency to `packages/taskflow/package.json`
- [ ] `MasterSchema`, `ShardSchema`, `TaskSchema`, `ReviewSchema`, `IncidentSchema`, `PushSchema` defined in `packages/taskflow/src/schema/`
- [ ] All schema types exported from `packages/taskflow/src/schema/index.ts`
- [ ] Every `JSON.parse(...)` call in `storage.ts` followed by `.parse(...)` against the matching schema
- [ ] Every write in `storage.ts` validates input before `writeFileSync`
- [ ] `TaskflowValidationError` class with file path, JSON field path, expected/received type
- [ ] Dashboard's `Task` / `Review` types remain compatible (no breaking changes for `src/lib/task-types.ts`)
- [ ] At least one happy-path and one rejection-path test per schema

## Quality gates

- [ ] `pnpm --filter insight-flow typecheck` passes
- [ ] `pnpm --filter insight-flow build:cli` succeeds
- [ ] `pnpm lint` passes
- [ ] `pnpm --filter insight-flow test` (or equivalent) passes
- [ ] No regressions in dashboard build (`pnpm build`)

## Verification

- [ ] `insight-flow current` runs against existing `workTasks/` without error (valid data passes)
- [ ] Corrupting a shard (e.g., remove `status` from one task) makes `insight-flow current` fail with a message naming the file + JSON path of the missing field
- [ ] Validation errors include the offending file path (not just a generic Zod stack)
- [ ] The exported `Task` type is identical in shape to (or stricter than) what the dashboard currently imports
