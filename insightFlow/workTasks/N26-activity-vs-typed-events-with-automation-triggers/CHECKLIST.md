# N26 — activity vs typed events with automation triggers — Checklist

## Done criteria

- [ ] `MANDATORY_EVENT_TYPES = ['start','done']` and `OPTIONAL_EVENT_TYPES` (10 types) defined in `types.ts`; `EVENT_TYPES` derived as union (12 total, includes `git-start | git-end`)
- [ ] `TaskEventSchema` (Zod) and `TaskEvent` type exported from `schema/index.ts`
- [ ] `insight-flow log-event <type>` command exists, writes to `workTasks/<id>/events.json`, prints JSON to stdout
- [ ] Dedup check: calling the same event type twice within `dedupWindowSeconds` (default 60 s) writes only one entry and fires hooks only once
- [ ] `events.dedupWindowSeconds` in `taskflow.config.json` controls the window; `0` disables dedup
- [ ] Invalid event type exits 1 with usage listing valid types
- [ ] `--phase` flag removed from `log-activity`; using it exits 1 with "unknown option"
- [ ] `/api/events?taskId=Nxx` endpoint returns `{ events: TaskEvent[] }`
- [ ] Dashboard timeline renders events with distinct icon/badge per type
- [ ] `taskflow.config.json` accepts `events.hooks` map; hooks fire detached on matching event
- [ ] All root role files updated: phase-markers block replaced by events block; mandatory (`start|done`) and optional events documented with explicit must/skip rules
- [ ] `TASK_GIT_ROLE.md` updated: standalone run uses `start`/`done` only; when called by another agent emits `git-start`/`git-end` instead
- [ ] `sync-role-templates.mjs` run; templates in `packages/taskflow/templates/roles/` match root files
- [ ] `pnpm build` passes (TypeScript strict, no errors)
- [ ] Hook fire test passes (`touch /tmp/...` hook fires on `log-event done`)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (existing init tests)
- [ ] No regressions: existing `log-activity` (without `--phase`) still works
- [ ] No regressions: dashboard still loads at `http://localhost:6006`

## Verification

- [ ] `insight-flow log-event done --task N26` → prints `{"event":"done","taskId":"N26","ts":"..."}` and writes to `workTasks/N26-.../events.json`
- [ ] Second `insight-flow log-event done --task N26` within 60 s → exits 0, no stdout, no second entry in `events.json`, hook not re-fired
- [ ] `curl http://localhost:6006/api/events?taskId=N26` → returns the event
- [ ] Dashboard N26 detail panel shows the `done` event with a green badge
- [ ] `touch /tmp/insight-flow-done-hook-fired` hook in config fires when `log-event done` is called
