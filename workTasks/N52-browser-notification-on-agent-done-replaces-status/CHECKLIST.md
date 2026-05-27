# N52 — browser notification on agent done replaces status transition notifs — Checklist

## Done criteria

- [ ] `POST /api/agent-done` endpoint added to project server; emits `agent-done` socket.io event
- [ ] `taskflow-notify.sh` includes fire-and-forget curl to `/api/agent-done` after OS notification
- [ ] Curl call guarded by active task check (only fires when `TASK_ID` is non-empty)
- [ ] `checkStatusTransitions`, `NOTIF_WATCHED`, `prevTaskSnapshot` removed from dashboard
- [ ] `sock.on('agent-done', ...)` added to dashboard; `fireDesktopNotif` simplified to no args
- [ ] `notifications.browser: false` suppresses socket emit without breaking the endpoint
- [ ] `install-lifecycle-hooks` / `init` regenerates the hook with the curl call

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] No regressions in existing OS notification path

## Verification

- [ ] Stop hook fires → both OS and browser notifications appear simultaneously
- [ ] `notifications.browser: false` → no browser notification, OS notification still fires
- [ ] `notifications.cli: false` → no OS notification, browser notification still fires
- [ ] Task status change (e.g. approved) → no browser notification fires
