# N07 — Add Zod schema validation to taskflow storage layer

**Type:** feat
**Priority:** high
**Created:** 2026-05-20

## Problem

Per REVIEW_ANALYSIS.md § 1 ("Architecture & Storage") and § 5 Phase 2.1, the taskflow storage layer uses `JSON.parse` on `workTasks/master.json` and `workTasks/tasks-NXX-NYY.json` files without runtime validation. Manual edits or corrupted writes can produce malformed JSON that silently propagates into the CLI and dashboard, causing crashes far from the source of the bad data. We need a schema-validated read/write boundary so failures surface immediately at the file I/O layer with a clear, actionable error message.

## Goal

1. Every read from `master.json` and any `tasks-NXX-NYY.json` shard is validated against a Zod schema before being returned.
2. Every write serializes from validated data — no silent partial writes.
3. Validation failures throw a single, well-formatted error naming the offending file, the JSON path of the bad field, and the expected vs actual type.
4. The Zod schemas live in `packages/taskflow/src/schema/` and are exported so consumers (dashboard, scripts) can reuse them.
5. The dashboard's existing `Task` / `Review` / `Incident` types in `src/lib/task-types.ts` are either inferred from the Zod schemas or kept manually in sync with a documented contract.

## Scope

### In scope

- `packages/taskflow/src/storage.ts` — wrap all reads/writes with Zod validation.
- `packages/taskflow/src/schema/` — define `MasterSchema`, `ShardSchema`, `TaskSchema`, `ReviewSchema`, `IncidentSchema`, `PushSchema` (folder already exists per `ls` output — confirm contents).
- `packages/taskflow/src/types.ts` — replace hand-rolled types with `z.infer<typeof ...>` where it doesn't cause churn.
- `packages/taskflow/package.json` — add `zod` as a dependency.
- Error-formatting helper to produce human-readable validation errors.
- One unit test (or smoke test) per schema covering happy path + at least one rejection case.

### Out of scope

- Migrating older shard files to a newer schema (out of band — call out if migration is needed).
- Adding Zod validation to the dashboard's runtime data loading (`src/lib/task-store.ts`) — file separately if desired.
- Changing the JSON file format on disk.

## Implementation plan

1. **Catalog the current shape**
   - Read `packages/taskflow/src/types.ts` and `packages/taskflow/src/storage.ts`.
   - Read one existing shard (e.g., `workTasks/tasks-N00-N09.json`) and `workTasks/master.json` to confirm the on-disk shape matches the types.
2. **Add Zod dependency**
   - `pnpm --filter insight-flow add zod` — pin to a stable major.
3. **Author schemas in `src/schema/`**
   - `task.ts` exports `TaskSchema`, `ReviewSchema`, `IncidentSchema`, `PushSchema`, status enums.
   - `master.ts` exports `MasterSchema` (meta + shard index).
   - `shard.ts` exports `ShardSchema` (array or object wrapper — match current shape).
   - Export `type Task = z.infer<typeof TaskSchema>` etc. from `index.ts`.
4. **Wrap storage reads**
   - In `storage.ts`, every `JSON.parse(...)` call is followed by `SomeSchema.parse(...)`.
   - On failure, throw a custom error class `TaskflowValidationError` with: file path, JSON path of the bad field (`error.issues[0].path.join(".")`), expected type, received value (truncated to 80 chars).
5. **Wrap storage writes**
   - Before `writeFileSync(...)`, run `SomeSchema.parse(data)` to catch caller bugs that would write malformed data.
6. **Reconcile with `types.ts`**
   - Replace duplicated type definitions with `z.infer<typeof ...>` where painless.
   - If the dashboard imports `Task` from this package (check `src/lib/task-types.ts`), keep the exported shape stable.
7. **Smoke test**
   - Manually corrupt a copy of `workTasks/tasks-N00-N09.json` (drop a required field) and confirm `insight-flow current` fails with a clear error pointing at the bad file and field.
   - Restore the file.
8. **Add minimal tests**
   - One Vitest/Node test file per schema asserting (a) a valid sample passes, (b) a known-bad sample fails with the expected JSON path in the error.

## Verification

- `insight-flow current` works against the existing `workTasks/` directory (no false positives on valid data).
- `insight-flow current` against a deliberately broken shard fails with a message that names the file + field.
- `npx tsc --noEmit` in `packages/taskflow` passes after the type changes.
- The package's exported `Task` / `Review` / `Incident` types remain importable by the dashboard without changes to call sites.

## Notes

- Source: REVIEW_ANALYSIS.md § 1 (Vulnerability), § 5 Phase 2.1.
- `packages/taskflow/schema/` already exists per directory listing — confirm whether it has stub files and either fill them in or reorganize.
- Zod adds ~12kB to the published bundle — acceptable for a CLI tool. If we want zero deps in the dashboard import path, gate Zod imports behind a `validate()` helper that the storage layer alone uses.
- If schemas diverge from current on-disk shape, document the migration step in the PR description (do NOT silently coerce; fail loudly).
- Pairs with [[N06]] (single source of truth) — both reduce drift between dashboard and CLI views of the data.
