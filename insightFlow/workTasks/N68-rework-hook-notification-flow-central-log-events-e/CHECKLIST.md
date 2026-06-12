# N68 — rework hook notification flow: central /log/events endpoint with status derivation — Checklist

## Done criteria

- [ ] `HookEvent` + `ProjectStatus` types + Zod schemas added.
- [ ] `POST /log/events` accepts validated events, updates in-memory store, derives status by latest timestamp.
- [ ] WebSocket broadcasts `event` frames every call and `status` frames only on transitions.
- [ ] Hook entry-point script writes JSONL backup, POSTs to `/log/events`, invokes OS notify only for `Stop` / `Notification`.
- [ ] `insight-flow init` installs the new hook entry point for all hook events.
- [ ] Dashboard subscribes to `status` frames; browser notification fires only when (transition ∈ {done, awaiting-permission}) AND tab unfocused AND localStorage toggle on AND `Notification.permission === "granted"`.
- [ ] Sound plays only on `→ done` / `→ awaiting-permission` (no change from N62 behavior).
- [ ] Project server forwards status changes to master with project UUID; failure is non-fatal.
- [ ] Hook script tolerates project server being down (fail-silent curl).
- [ ] Installed hook scripts are thin wrappers that exec `insight-flow hook <event-type>`; all logic lives in the npm package so package upgrades take effect without re-running `init`.
- [ ] `insight-flow init --force` (or new `--hooks-only` / `migrate-hooks` subcommand) rewrites `.claude/hooks/*` + the `hooks` block in `.claude/settings.json` without clobbering other scaffolded files.
- [ ] `taskflow.config.json` carries a `taskflow.hooksVersion`; CLI warns when installed hooks lag behind the package's bundled version.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new status-derivation unit test)
- [ ] No TypeScript errors
- [ ] No regressions in dashboard live updates or existing OS notification on `Stop`

## Verification

- [ ] `curl -X POST localhost:6006/log/events -d '{...Stop...}'` → status flips to `done`, both WebSocket frames observed.
- [ ] `curl -X POST .../log/events -d '{...Notification with "permission" message...}'` → `awaiting-permission`.
- [ ] `curl -X POST .../log/events -d '{...Notification with idle message...}'` → `idle`.
- [ ] `curl -X POST .../log/events -d '{...PreToolUse...}'` → `active`.
- [ ] Send same event twice with same id — duplicate handled gracefully (idempotent or de-duped within window).
- [ ] Kill master server, fire events → project server still responds 200; dashboard still updates.
- [ ] Focus dashboard tab, fire `→ done` → sound plays, no browser notification. Blur tab, fire `→ done` → both.
- [ ] Simulate package upgrade: bump package version locally, run nothing in consumer project, fire a hook → new behavior takes effect (proves thin wrappers route through installed package).
- [ ] Run `insight-flow init --force` (or migration subcommand) against playground after manually breaking `.claude/hooks/log-event.sh` → file is restored, other scaffolded files untouched.
