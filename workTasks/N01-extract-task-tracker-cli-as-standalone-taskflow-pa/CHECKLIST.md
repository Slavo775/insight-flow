# N01 — Extract task-tracker CLI as standalone taskflow package — Checklist

## Done criteria
- [ ] `packages/taskflow/` exists with valid `package.json` (name, bin, main, types)
- [ ] Core logic extracted into typed modules (storage, commands, state-machine, config, cli)
- [ ] `taskflow.config.json` schema defined and config resolution works
- [ ] `taskflow init` scaffolds workTasks dir, master.json, config, and role templates
- [ ] All existing commands (`create`, `status`, `list`, `current`, `stats`, `review-start`, `review-end`, `fix-start`, `fix-end`, `push`, `merge`, `done`, `incident-*`, `change-*`) work via `taskflow <cmd>`
- [ ] JSON Schema files exist for task, shard, and master formats
- [ ] Role `.md` files templated with replaceable placeholders
- [ ] `scripts/task-tracker.mjs` replaced with thin wrapper delegating to package
- [ ] Package builds successfully with tsup/unbuild
- [ ] Dashboard extracted into `packages/dashboard/` with standalone + embeddable modes
- [ ] `taskflow ui` serves the dashboard locally reading from `workTasks/`
- [ ] Package published to npm (`npx taskflow init` works)
- [ ] CI/CD workflow templates exist in `packages/taskflow/templates/`
- [ ] Webhook system fires HTTP callbacks on configurable status transitions
- [ ] Plugin interface defined in `taskflow.config.json` and documented
- [ ] Jira importer/exporter module implemented
- [ ] Linear sync module implemented
- [ ] GitHub Issues sync module implemented

## Quality gates
- [ ] `npx tsc --noEmit` passes (both root project and packages/taskflow)
- [ ] `npm run lint` passes
- [ ] Basic tests pass for config resolution, init, and core commands
- [ ] No regressions in insight-flow dashboard data loading

## Verification
- [ ] Fresh `taskflow init` in an empty directory produces working setup
- [ ] `taskflow create --title "Test" --type feat --priority low` → task appears in workTasks/
- [ ] `taskflow current` returns expected output
- [ ] Existing N00 task data validates against JSON schema
- [ ] `node scripts/task-tracker.mjs current` still works in insight-flow repo
- [ ] `taskflow ui` launches dashboard and displays task data
- [ ] `npm publish --dry-run` succeeds for all packages
- [ ] Webhook fires on status transition in test setup
- [ ] At least one external sync (Jira/Linear/GitHub) round-trips task data
