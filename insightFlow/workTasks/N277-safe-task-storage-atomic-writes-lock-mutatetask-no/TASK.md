# N277 — Safe task storage — atomic writes, lock + mutateTask, no shard overwrite, keep unknown fields, config schema

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

Task state can be silently lost:

- Every save is a plain `writeFileSync` inside a load → mutate → save with no lock. Concurrent agents overwrite each other, two `create` calls can hand out the same ID, and a reader can see a half-written file.
- `ensureShardExists` writes an empty shard whenever the name is missing from `master.json`, without checking the file. A stale master saved by a picker command plus one `create` therefore wipes a whole shard.
- Zod strips unknown keys, so an older global binary deletes fields that newer versions added (e.g. `chainId`).
- A missing shard silently loads as empty. Changing `shardSize` makes every task "not found".
- `create --agent <bad>` leaves an orphan folder and reuses the ID.

Source: `N271/AUDIT.md` **A08, A09, A25, A27, A28, A77**.

## Goal

1. All task-state writes are atomic (temp + rename) and serialized by a lock.
2. ID assignment and shard creation are safe under concurrency and never overwrite an existing shard.
3. Load → save round-trips preserve fields the binary doesn't know.
4. Missing shards and invalid config fail loudly with the file named.
5. Tests prove parallel `create` and the stale-master scenario are safe.

## Scope

### In scope

- `packages/taskflow/src/core/storage.ts` — `loadMaster`, `saveMaster`, `loadShard`, `saveShard`, `ensureShardExists`, `resolveId` neighbourhood (~:38-206).
- A new core file for `atomicWriteJson` + `withWorkLock`, moved from `dashboard/server/custom-defs.ts:201-211` (custom-defs then imports it).
- `packages/taskflow/src/core/schema/index.ts` — Task/Shard/Master object modes, unique-id refine (~:105-189).
- `packages/taskflow/src/core/config.ts` — zod schema for `TaskflowConfig` (~:53-126).
- `packages/taskflow/src/cli/commands/create.ts` — order of resolve vs write (~:142-213).
- `packages/taskflow/src/cli/commands/query.ts`, `change.ts`, `incident.ts` — stop saving a stale master (~query.ts:316/367/405, change.ts:131, incident.ts:52).
- `packages/taskflow/src/cli/commands/migrate.ts` (~:107-112), `src/core/global-config.ts` (~:98-150), `src/core/log-store.ts` (~:39-41).
- Tests.

### Out of scope

- Argument parsing, `--id` requirement, transition table, error printing → N278. (N278 builds on the `mutateTask` helper from this task.)
- `events.json` / activity log → N279.
- Deleting or redesigning the `Storage` port → N278.

## Implementation plan

1. **Atomic write in core (A08).** `atomicWriteJson(path, data)`: write a temp file in the same directory, then `renameSync`. Move the existing helper from `custom-defs.ts`, make custom-defs import it, and use it in `saveMaster`, `saveShard`, the side files (`reviews.json`, `incidents.json`), `config.ts` writes and `global-config.ts` writes.
2. **Work lock (A08).** `withWorkLock(workDir, fn)`, synchronous like the CLI:
   - Create `<workDir>/.lock` with `flag: "wx"`, holding pid + timestamp.
   - Retry with short sleeps (`Atomics.wait` on a `SharedArrayBuffer`) for up to ~5 s.
   - Break a stale lock (dead pid, or older than 30 s).
   - Release in `finally`.
   - Add `.lock` to the project/scaffold `.gitignore`.
3. **Mutation helpers (A08, A09).** `mutateMaster(config, fn)` and `mutateTask(config, id, fn)`: take the lock → re-read master and shard from disk → apply `fn` → save atomically. Route every command that writes master or a shard through them. Pickers (`next`, `next-review`, `next-fix`, `next-change`, `incident-create`) only update `currentTaskId` via `mutateMaster` and never save a master loaded at startup.
4. **Safe ID + shard creation (A09).** Inside the lock in `create`: `nextId = max(master.nextId, highest task number on disk + 1)`. Create a shard file only with `flag: "wx"` and never replace an existing file. Derive `range` from the file name.
5. **Validate before writing in `create` (A25).** Call `resolveFlowId` (and every other validation) before `ensureShardExists` / `mkdirSync`, the same way `resolveChain` already is.
6. **Keep unknown fields (A27).** Make the Task, Shard (root) and Master (root + meta) schemas preserve unknown keys (`.passthrough()` / `.catchall(z.unknown())`). Add a `superRefine` that rejects duplicate task IDs in a shard. Make sure TypeScript types still infer cleanly.
7. **Fail loudly (A28).**
   - A shard listed in master but missing on disk throws `TaskflowValidationError` naming the file.
   - Wrap `JSON.parse` in `loadMaster` / `loadShard` / config load so errors name the file.
   - Add a zod `TaskflowConfig` schema: `shardSize` positive int, ports 1–65535, `maxEvents` positive int, unknown keys allowed.
   - Persist `shardSize` in `master.meta`, and refuse a config `shardSize` that differs once shards exist.
8. **Small integrity fixes (A77).** `migrate-reviews` skips tasks whose side files already exist. `log-store` rejects a `type` outside `LOG_TYPES`.
9. **Tests.**
   - Spawn 8 parallel `create` calls → 8 distinct IDs, all present in shards and folders.
   - Stale master: load an old master, `create` in another process, save the old one via a picker → shard intact.
   - Interrupted write: only a temp file exists → the original is intact and readable.
   - An unknown key on a task survives `implement-start`.
   - Missing listed shard → clear error.
   - Changing `shardSize` with existing shards → refused.
   - `create --agent nope` → no folder, no shard change.
   - `migrate-reviews` leaves existing side files alone.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new concurrency tests (run them 5× in a row to check flakiness).
- Manual in `playground/`: `for i in 1 2 3 4 5 6; do insight-flow create --title "race $i" --type fix --priority low & done; wait` → 6 distinct IDs; `insight-flow list` shows all 6. Delete them afterwards.
- `git diff` of a shard after a normal lifecycle command shows only the intended change (no reordering, no dropped keys).

## Notes

- Detail and evidence: `N271/AUDIT.md` A08, A09, A25, A27, A28, A77. Probes in the audit confirmed duplicate IDs pass the schema, unknown keys are stripped, and `shardSize: 7` maps N271 to `tasks-N266-N272.json`.
- **Starts only after N267 (flow chains, PR #174) is merged**: it changes `create.ts`, `set-flow.ts`, `chain-advance.ts` and the schema.
- N278 (strict CLI) and N279 (events) depend on the helpers from this task.
- Recommended run: `/task-analyze N277` → `/task-implement N277`.
