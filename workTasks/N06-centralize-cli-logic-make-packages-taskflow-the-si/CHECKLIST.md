# N06 — Centralize CLI logic — make packages/taskflow the single source of truth — Checklist

## Done criteria
- [ ] Inventory of all CLI callers (root package.json, CI workflows, .claude/ hooks/skills/commands, docs) produced and addressed
- [ ] Root `package.json` scripts call `insight-flow` (no direct `node scripts/...` calls for taskflow operations)
- [ ] `.github/workflows/*.yml` build the package before any step that uses `insight-flow`
- [ ] `.claude/` hooks/skills/commands reference `insight-flow`, not the legacy script
- [ ] `packages/taskflow/README.md` lists every supported command with flags
- [ ] Root `CLAUDE.md` "Scripts" section points to the package as canonical
- [ ] Any internal duplication inside `packages/taskflow/src/` between `cli.ts` and `commands/` extracted into shared helpers

## Quality gates
- [ ] `npx tsc --noEmit` passes (root and `packages/taskflow`)
- [ ] `pnpm lint` passes
- [ ] `pnpm --filter insight-flow build:cli` succeeds
- [ ] No regressions in affected area

## Verification
- [ ] `grep -rn "task-tracker" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` returns zero matches
- [ ] No file outside `packages/taskflow/` contains taskflow internal helper names (`loadMaster`, `loadShard`, status-transition logic)
- [ ] `insight-flow --help` output matches the command list in `packages/taskflow/README.md`
- [ ] `insight-flow current` returns the current task from repo root
- [ ] CI workflow (manually triggered or via `act`) passes end-to-end with the new wiring
