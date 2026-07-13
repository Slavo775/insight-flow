# N226 — Fix dashboard shard-file ordering so newest tasks appear first (numeric, not lexicographic) — Checklist

## Done criteria

- [ ] `client/api.ts` shard index sorts by numeric starting ID, not `localeCompare`
- [ ] Highest-N shard is first (page 1); `N00-N09` is last
- [ ] Non-matching filenames sort predictably (last), no `NaN`/crash
- [ ] Within-shard task order unchanged; server/schema/data untouched

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (vite + tsc)
- [ ] eslint clean on `client/api.ts` (pre-commit hook: prettier + eslint --fix + typecheck)
- [ ] No regressions in Kanban board / ShardNav "Newer/Older" navigation

## Verification

- [ ] Sorting `["tasks-N00-N09.json","tasks-N90-N99.json","tasks-N100-N109.json","tasks-N200-N209.json"]` yields `N200-N209, N100-N109, N90-N99, N00-N09`
- [ ] In `insight-flow ui` with 200+ tasks, first page shows the newest tasks; N90–N99 no longer precedes N100+/N200+
