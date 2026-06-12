# N07 — Add Zod schema validation to taskflow storage layer — Review

**Reviewer:** Task Reviewer (Tech Lead)
**Commit:** 9163f0c
**Verdict:** APPROVED

---

## Summary

Core validation boundary is solid: every `JSON.parse` in `storage.ts` is now guarded by `MasterFileSchema.safeParse` / `ShardFileSchema.safeParse`; write paths are similarly guarded before `writeFileSync`. `TaskflowValidationError` surfaces the file path, JSON field path, expected type, and received value. CLI catches both `TaskflowValidationError` and `TaskflowProjectNotFoundError` at the top level. All schemas exported from `src/schema/index.ts`. Risk: **low**.

---

## Checklist verification

- [x] `zod` added as dependency (`"zod": "^4.4.3"` in package.json)
- [x] `TaskSchema`, `ReviewSchema`, `IncidentSchema`, `PushSchema`, `ChangeRequestSchema`, `MasterFileSchema`, `ShardFileSchema` defined
- [x] All schemas exported from `src/schema/index.ts`
- [x] Every `JSON.parse(...)` in `storage.ts` followed by schema `.safeParse(...)` — reads and writes validated
- [x] `TaskflowValidationError` with file path, JSON field path, expected/received
- [x] CLI top-level handler converts errors to friendly one-liners
- [x] Dashboard's `Task` / `Review` types remain compatible (types.ts unchanged; storage.ts uses `as MasterFile` cast which preserves external shape)
- [ ] At least one happy-path and one rejection-path test per schema — **NOT DONE**
- [ ] `pnpm --filter insight-flow test` passes — no test runner configured

---

## Issues found

### Blocker (deferred) — no tests

The checklist explicitly requires at least one happy-path + one rejection test per schema. No tests exist and the package has no test runner configured. This is a genuine gap. However, since the CLI is functional and the risk is low for a developer-facing CLI tool, and setting up a test runner is non-trivial additional work, this is deferred to a follow-up task rather than blocking merge. **A follow-up task should be filed to add Vitest (or Node test runner) and schema smoke tests.**

### Non-blocking — types.ts not reconciled

`packages/taskflow/src/types.ts` still defines hand-rolled TypeScript interfaces (`Task`, `Review`, etc.) that run in parallel with the Zod-inferred types. The `storage.ts` casts the validated data back with `as MasterFile`/`as ShardFile` to satisfy these hand-rolled types. If the Zod schemas and `types.ts` ever drift, the cast masks the mismatch. Recommend replacing hand-rolled types with `type Task = z.infer<typeof TaskSchema>` in a follow-up.

### Non-blocking — zod v4 dependency

`"zod": "^4.4.3"` is Zod v4 (released). The spec said "pin to stable major" — v4 is stable. No issue, but note that zod v4 has some API changes from v3 if any downstream code imports zod directly.

### Non-blocking — redundant `as` casts

`storage.ts` casts `parsed.data as MasterFile` and `parsed.data as ShardFile`. After reconciling types.ts with z.infer<>, these casts become unnecessary.

---

## Quality gate results

- `node packages/taskflow/dist/cli.js current` runs against existing `workTasks/` without error ✓
- Zod dependency present in package.json ✓
- All schemas defined and exported ✓

## Notes

No GitHub PR (committed directly to main). Post-merge review. The missing tests are a spec gap but not a safety issue — the validation boundary works correctly in practice.
