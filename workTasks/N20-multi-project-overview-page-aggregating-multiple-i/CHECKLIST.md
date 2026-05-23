# N20 — Multi-project overview page — Checklist

## Done criteria

**New package `packages/insight-flow-master`:**
- [ ] Package scaffolded: `package.json` (name `insight-flow-master`, bin `insight-flow-master`), `tsconfig.json`, `tsup.config.ts`.
- [ ] `src/types.ts`: `MasterProjectEntry`, `MasterProjectState`.
- [ ] `src/registry.ts`: `register()`, `update()` (returns false on unknown id), `getAll()`.
- [ ] `src/lock.ts`: `readMasterLock`, `writeMasterLock`, `clearMasterLock`, `checkMasterPidAlive`.
- [ ] `src/server.ts`: `POST /api/register`, `POST /api/projects/:id/update` (401 on unknown id), `GET /overview`, Socket.IO `project-update` broadcast, CORS `*`.
- [ ] `src/overview.ts`: `getOverviewHtml()` — card grid, connection badge timing, N19 notification diff-and-fire, dark-theme CSS.
- [ ] `src/index.ts`: `--port` arg, stale-lock detection, `startMasterServer()`, lock write, SIGINT/SIGTERM cleanup.
- [ ] `pnpm --dir packages/insight-flow-master run build` produces runnable `dist/index.js`.

**Modified `packages/taskflow`:**
- [ ] `MasterConfig` (with `startMasterLocally?: boolean`) added to `src/types.ts`; `master?` field on `TaskflowConfig`.
- [ ] `MasterConfigSchema` added to `src/schema/index.ts`.
- [ ] `src/server/index.ts` auto-starts master in-process only when `startMasterLocally !== false` and master not already running.
- [ ] Project server registers with master on startup (non-standalone); unreachable master logs warning and skips silently.
- [ ] Project server pushes `MasterProjectState` on every file-change event.
- [ ] 401 from master triggers silent re-registration + one push retry.
- [ ] `GET /overview` on project server: iframe to master URL, or 404 in standalone mode.
- [ ] README "Multi-project overview" section added (local + remote master scenarios, `startMasterLocally` usage).

## Quality gates

- [ ] `pnpm --dir packages/insight-flow-master run typecheck` passes.
- [ ] `pnpm --dir packages/insight-flow-master run build` passes.
- [ ] `pnpm --dir packages/taskflow run typecheck` passes.
- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes.
- [ ] `GET /` (single-project dashboard) behaviour is unchanged.
- [ ] `GET /` on a standalone project still works normally.

## Verification

- [ ] Manual A: two `insight-flow ui` instances on different ports; master auto-starts on first; both cards appear at `http://localhost:6000/overview` with correct labels and current tasks.
- [ ] Manual B: status change via CLI repaints card within ~1 s; OS notification fires with correct project label.
- [ ] Manual C: kill one project server; card badge shows "down" within 120 s; other card keeps updating.
- [ ] Manual D: restart killed server; card recovers via re-registration.
- [ ] Manual E: kill master; next `insight-flow ui` start auto-restarts master; both projects re-register; overview recovers.
- [ ] Manual F: `standalone: true` → no master started, `GET /overview` returns 404.
- [ ] Manual G: master restart while projects running → next push 401 → silent re-register → card recovers.
- [ ] Manual H: `startMasterLocally: false` + remote `url` → no local master started; project registers with remote; cards appear on remote `/overview`.
