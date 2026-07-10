# N213 — Unified persistent project registry + init opt-in to the master hub — Checklist

## Done criteria

- [ ] Persistent hub registry at `~/.insight-flow/hub.json` (id, label, path, port, `bulkRegistered`, `registeredAt`) with Zod validation
- [ ] Read/write helpers in `global-config.ts`
- [ ] Migration folds existing `batch-ui.json` entries in (idempotent, no duplicates)
- [ ] Master seeds its in-memory registry from the persisted list on boot (offline until a dashboard connects)
- [ ] `insight-flow init` asks to register when the project isn't already registered; on yes it's added + assigned a free port
- [ ] `--yes` behavior defined (skip/ask default documented)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] After `init` + opt-in, `hub.json` contains the project; `/overview` shows it (offline) before its dashboard starts
- [ ] Migration test: `batch-ui.json` entries appear once in the unified registry
