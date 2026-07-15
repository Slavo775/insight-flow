# N239 — Release insight-flow 2.8.0 — ship N238 deterministic status engine + hub-only notifications — Checklist

## Gaps to fix before release (from task-release-check)

- [x] **Docs gap — README Tier-2 notifications section is stale.** Rewritten (`README.md:391-405`) as "Browser notifications (via the hub)"; 8-status list, per-project mute, `tf-notif-settings`, silent-when-direct. (dc95fdf)
- [x] **Docs gap — config-line descriptions stale.** Fixed `README.md:349` (hub gates the popups), `:351` (sound from the hub), and the example comment `:258`. (dc95fdf)

## Release steps

- [x] README docs gap fixed, committed, and on `main` (dc95fdf, via task-release-fix)
- [ ] Release PR #156 (`chore(main): release 2.8.0`) merged — bumps `package.json` → 2.8.0, updates CHANGELOG, tags `v2.8.0`
- [ ] npm-publish deployment approved (publish workflow gates on a deployment-environment approval)
- [ ] Release notes mention the behavior change: directly-opened project dashboards (`:6006`) no longer notify — the hub (`:6100`) is the single notifier

## Quality gates (confirmed at release-check)

- [x] Build passes (`pnpm --dir packages/taskflow build`)
- [x] `typecheck` passes (root + both client tsconfigs)
- [x] Tests pass — 362/362 on merged `main`
- [x] No regressions in the status/notification path

## Verification

- [ ] `npm view insight-flow version` returns `2.8.0` after publish
- [ ] Installed `insight-flow@2.8.0` — hub notifications work; README no longer describes a project-dashboard notification popover
- [ ] `v2.8.0` git tag exists and CHANGELOG has the 2.8.0 entry
