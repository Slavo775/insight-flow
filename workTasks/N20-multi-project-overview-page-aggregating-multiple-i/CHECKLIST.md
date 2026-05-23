# N20 — Multi-project overview page — Checklist

## Done criteria

- [ ] `MasterConfig`, `MasterProjectEntry`, `MasterProjectState` types added to `types.ts`; `master?` field added to `TaskflowConfig`.
- [ ] `MasterConfigSchema` added to `schema/index.ts`.
- [ ] `server/master.ts` implements: `POST /api/register`, `POST /api/projects/:id/update` (401 on unknown id), `GET /overview`, Socket.IO broadcast of `project-update`, lock file helpers.
- [ ] `commands/master.ts` implements `insight-flow master`: stale-lock detection, master start, lock write, SIGINT cleanup.
- [ ] `cli.ts` routes `master` command to `commands/master.ts`.
- [ ] `server/index.ts` auto-starts master (if not already running per lock file) on non-standalone `insight-flow ui`.
- [ ] Project server registers with master on startup; stored id used for subsequent pushes.
- [ ] Project server pushes `MasterProjectState` to master on every file-change event.
- [ ] 401 response from master triggers silent re-registration + one retry of the push.
- [ ] `GET /overview` on project server returns iframe to master or 404 in standalone mode.
- [ ] `server/overview.ts` renders card grid: label, connection badge (live/stale/down), current task, status counts, latest activity line, "Open dashboard" link.
- [ ] Overview browser JS connects to master Socket.IO (same origin); `project-update` event re-renders the affected card.
- [ ] N19 notification diff-and-fire in overview JS: title format `<label>: <taskId> → <status>`; reads `tf-notif-*` localStorage settings.
- [ ] `master.standalone: true` in `taskflow.config.json` disables all master interaction.
- [ ] README "Multi-project overview" section added.

## Quality gates

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
