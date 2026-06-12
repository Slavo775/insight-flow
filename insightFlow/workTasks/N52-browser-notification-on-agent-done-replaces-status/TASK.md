# N52 — browser notification on agent done replaces status transition notifs

**Type:** rework
**Priority:** medium
**Created:** 2026-05-26

## Problem

Browser notifications currently fire on task status transitions (implemented, approved, fix-needed, etc.) by diffing task snapshots on every socket update. This is noisy, hard to control, and duplicates the OS notification responsibility. What's actually useful is a single "Claude finished a turn" signal in the browser — the same event the OS notification already handles via the Stop hook.

## Goal

1. Browser notification fires once when the agent finishes a turn (Stop hook → project server → socket.io → browser).
2. All status-transition browser notification logic removed from the dashboard (`checkStatusTransitions`, `NOTIF_WATCHED`, `prevTaskSnapshot`).
3. `notifications.cli` controls OS notification (macOS osascript), `notifications.browser` controls browser notification — both driven by the same Stop hook trigger.
4. The two channels are independently togglable in `taskflow.config.json` with no other config needed.
5. Browser notification fires only when there is an active task (mirrors OS notification behaviour — no spurious pings on unrelated Claude sessions).

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — add `POST /api/agent-done` endpoint; emit `agent-done` socket.io event to all connected browser clients.
- `.claude/hooks/taskflow-notify.sh` — after firing OS notification, `curl -s -X POST http://localhost:<port>/api/agent-done` (fire and forget, no failure handling needed).
- `packages/taskflow/src/notify-hook.ts` — update `NOTIFY_HOOK_SCRIPT` to include the curl call; read port from config or default to 6006.
- `packages/taskflow/src/server/dashboard.ts` — remove `checkStatusTransitions`, `NOTIF_WATCHED`, `prevTaskSnapshot`; add `sock.on('agent-done', fireDesktopNotif)`.
- `packages/taskflow/src/server/dashboard.ts` — `fireDesktopNotif` no longer needs `taskId`/`status` args; message becomes `"<projectName>: Claude finished"`.

### Out of scope

- OS notification logic changes (`cmdNotify`, `fireNotification` in `notify.ts`).
- Browser notification permission flow — keep as is.
- Sound on browser notification — keep the existing `notifSettings.sound` flag.
- Windows / Linux OS notification improvements (separate concern).

## Implementation plan

1. **Add `POST /api/agent-done` to project server** — in `packages/taskflow/src/server/index.ts`, handle `POST /api/agent-done`: check `config.notifications?.browser !== false`, then `io.emit('agent-done', { ts: Date.now() })`. Return `200 { ok: true }` always (even if browser notifications disabled — the hook doesn't need to know).

2. **Update the Stop hook script** — in `packages/taskflow/src/notify-hook.ts`, extend `NOTIFY_HOOK_SCRIPT` to read the server port (from `taskflow.config.json` if parseable, else default `6006`) and append a fire-and-forget curl after the OS notification call:
   ```bash
   SERVER_PORT=6006
   # try to read port from config
   ...
   curl -sf -X POST "http://localhost:${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true
   ```
   Only send curl when `TASK_ID` is non-empty (active task guard — mirrors existing status check).

3. **Update the installed hook file** — `packages/taskflow/src/commands/install-lifecycle-hooks.ts` or wherever the physical `.claude/hooks/taskflow-notify.sh` is written; ensure re-running `install-lifecycle-hooks` or `init` regenerates the hook with the curl call.

4. **Remove status-transition logic from dashboard** — in `packages/taskflow/src/server/dashboard.ts`, delete: `prevTaskSnapshot`, `NOTIF_WATCHED`, `checkStatusTransitions` function, and all calls to `checkStatusTransitions`. Remove the `prevTaskSnapshot[t.id] = t.status` assignment inside shard load callbacks.

5. **Add `agent-done` socket listener in dashboard** — add `sock.on('agent-done', function() { fireDesktopNotif(); })`. Simplify `fireDesktopNotif` to take no arguments: title is always `(PROJECT_NAME ? PROJECT_NAME + ': ' : '') + 'Claude finished'`.

6. **Guard browser notification path** — `POST /api/agent-done` should only emit the socket event when `config.notifications?.browser !== false`. If disabled, return 200 immediately without emitting.

## Verification

- Stop hook fires → OS notification appears (macOS) AND browser tab shows a desktop notification.
- Setting `notifications.browser: false` in config → `POST /api/agent-done` returns 200 but no socket event emitted, no browser notification shown.
- Setting `notifications.cli: false` → OS notification suppressed, browser notification still fires.
- No browser notification fires on task status changes (approved, fix-needed, etc.) — only on agent done.
- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.

## Notes

- The curl call in the hook is deliberately silent (`>/dev/null 2>&1 || true`) — if the project server isn't running, the notification just doesn't arrive in the browser. No error, no retry needed.
- Open question for implementer: should the curl call be skipped entirely when `notifications.browser: false` in config? Parsing JSON in bash is fragile — simpler to always send the curl and let the server decide whether to emit. This is the recommended approach (step 6).
- The physical `.claude/hooks/taskflow-notify.sh` in consumer projects will be stale after this change. Users need to re-run `insight-flow init` or `insight-flow install-lifecycle-hooks` to get the updated hook. Consider logging a warning in the server if the hook file looks outdated (optional stretch goal).
