# N277 — Safe task storage — atomic writes, lock + mutateTask, no shard overwrite, keep unknown fields, config schema — Checklist

## Done criteria

- [ ] `atomicWriteJson` lives in core and is used by master, shard, side-file, config and global-config writes; custom-defs imports it (A08, A77)
- [ ] `withWorkLock` (O_EXCL lockfile, retry, stale-lock break) guards every master or shard mutation; `.lock` is gitignored (A08)
- [ ] `mutateMaster` / `mutateTask` re-read from disk inside the lock; picker commands no longer save a stale master (A08, A09)
- [ ] `create` computes the next ID from max(master, disk) and never overwrites an existing shard file (A09)
- [ ] `create` validates `--agent` / flow before any write (A25)
- [ ] Task, Shard and Master schemas preserve unknown keys; duplicate task IDs are rejected (A27, A08)
- [ ] A missing listed shard and unparsable JSON fail with the file named; `TaskflowConfig` is zod-validated; a `shardSize` change with existing shards is refused (A28)
- [ ] `migrate-reviews` skips existing side files; `log-store` rejects unknown `type` (A77)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`scaffold-and-bundle`, `status-setter`, `flow-chains`, `flow-binding`, `migrate-*`, `seams`, `custom-defs-api` green)

## Verification

- [ ] Test: 8 parallel `create` → 8 distinct IDs, all persisted
- [ ] Test: the stale-master scenario leaves the shard intact
- [ ] Test: an unknown task field survives a lifecycle command
- [ ] The new concurrency tests pass 5 runs in a row
