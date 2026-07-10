# N213 — Unified persistent project registry + init opt-in to the master hub — Checklist

## Done criteria

- [x] Persistent hub registry at `~/.insight-flow/hub.json` (id, label, path, port, `bulkRegistered`, `registeredAt`) with Zod validation (`HubProjectEntrySchema`/`HubRegistrySchema`)
- [x] Read/write helpers in `global-config.ts` (`readHubRegistry`/`writeHubRegistry`/`upsertHubProject`/`findHubProjectByPath`/`assignHubPort`)
- [x] Migration folds existing `batch-ui.json` entries in (idempotent, no duplicates) — `migrateBatchUiIntoHub`
- [x] Master seeds its in-memory registry from the persisted list on boot (offline until a dashboard connects) — `runMaster` → `registry.seed`, reconciles on live register (same `projectId`)
- [x] `insight-flow init` asks to register when the project isn't already registered; on yes it's added + assigned a free port
- [x] `--yes` behavior defined: non-interactive/non-TTY defaults to **No** (skip); `--register-hub` / `--no-register-hub` force the decision

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**328/328**, +2 new)
- [x] typecheck passes

## Verification

- [x] After `init --register-hub`, `hub.json` contains the project (label = project name, port 6007, bulkRegistered) — E2E verified
- [x] Master boot seeds `/overview` from `hub.json` — seeded project shown before its dashboard starts (E2E verified)
- [x] Migration test: `batch-ui.json` entries appear once in the unified registry; re-migration is a no-op (`test/hub-registry.test.mjs`)
