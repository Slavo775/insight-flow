# N174 — Installable & uninstallable agents and modules (dashboard) — Checklist

## Done criteria

- [x] Install engine generalized to a `{ kind: flow|agent|module, id }` target (`flow-install.ts`); flow wrappers preserved
- [x] Agent install composes prompt MD (command/skill per `command` config) + installs its modules' MCP/skill/hook artifacts, prompting for `${VAR}` inputs
- [x] Module install works for `mcp-server`/`skill`/`hook` (+ `bundle` expands); non-installable kinds rejected and hidden/disabled in UI
- [x] `.claude/taskflow-managed.json` uses per-target buckets (`flow:`/`agent:`/`module:`) with reference counting; migration handles existing manifests
- [x] Uninstall for all three targets removes an artifact only when its last owner is gone, restoring N172 snapshots for removed MCP entries
- [x] Dashboard has Install/Uninstall buttons on agent + module views and an Uninstall button on the flow view
- [x] New API routes: `GET/POST /api/install[-plan]` and `GET/POST /api/uninstall[-plan]` reusing input/conflict/SSE machinery

## Quality gates

- [x] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes — N/A (no ESLint/Prettier configured at workspace root, per CLAUDE.md)
- [x] Related tests pass — new `test/install-targets.test.mjs` (6/6) + full suite (only the pre-existing flaky server-boot tests fail under parallel load; pass in isolation)
- [x] No regressions in affected area

## Verification

- [x] `pnpm --dir packages/taskflow run build` (tsup + vite) and `npx tsc --noEmit` pass
- [x] HTTP smoke against a live `insight-flow ui`: agent/skill-module install-plan → 200; `section` module install-plan → 400; `POST /api/install` agent writes `.claude/commands/taskmaster.md`; `POST /api/uninstall` removes it; uninstall-plan reports `removed`/`retained`
- [x] Unit: shared artifact retained until last owner uninstalled; force-overwrite restored from snapshot on uninstall; `project:<id>`→`flow:<id>` manifest migration
