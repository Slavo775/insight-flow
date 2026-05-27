# N52 — browser notification on agent done replaces status transition notifs — Review

## Implementation Summary

**Date:** 2026-05-27
**Files changed:** `packages/taskflow/src/server/index.ts`, `packages/taskflow/src/notify-hook.ts`, `packages/taskflow/src/server/dashboard.ts`

### Problem solved

Browser notifications previously fired on every task status transition (`implemented`, `approved`, `fix-needed`, etc.) by diffing snapshots on every socket update. This was noisy, fragile, and duplicated the OS notification concern. The real signal users need is "Claude finished a turn" — once, per session, not per status change.

### What changed

#### 1. `POST /api/agent-done` endpoint (`packages/taskflow/src/server/index.ts`)

A new HTTP endpoint was added:

```
POST /api/agent-done
→ 200 { ok: true }
```

- If `config.notifications?.browser !== false`, emits `io.emit('agent-done', { ts: Date.now() })` to all connected dashboard clients.
- Always returns `200` regardless of whether browser notifications are enabled — the Stop hook does not need to know the config state.
- CORS `Access-Control-Allow-Methods` updated to include `POST`.

#### 2. Stop hook curl call (`packages/taskflow/src/notify-hook.ts` → `NOTIFY_HOOK_SCRIPT`)

The bash hook script now fires a fire-and-forget HTTP request to the project server after the OS notification:

```bash
# Read server port from taskflow.config.json (default 6006)
SERVER_PORT=6006
CONFIG_FILE="$PROJECT_ROOT/taskflow.config.json"
if [ -f "$CONFIG_FILE" ]; then
  _p=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | head -1 | grep -o '[0-9]*$')
  [ -n "$_p" ] && SERVER_PORT="$_p"
fi
curl -sf -X POST "http://localhost:${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true
```

Key design decisions:
- The curl is guarded by `[ -z "$TASK_ID" ] && exit 0` (active-task check) — no spurious pings when Claude is not working on a task.
- Port is read from the config file by grepping for `"port":` and taking the first match (server port appears before master port in the standard config layout). Defaults to `6006` if the file is absent or unparseable.
- `>/dev/null 2>&1 || true` — completely silent; if the dashboard server isn't running, the browser notification simply doesn't arrive.
- The OS notification logic (`case "$STATUS" in implemented|approved|...`) is **unchanged** — it still only fires on meaningful statuses. The curl fires independently for any active task.

#### 3. `installNotifyHook` overwrites stale hooks (`packages/taskflow/src/notify-hook.ts`)

Previously `installNotifyHook` skipped writing the hook file if it already existed (`if (!existsSync(hookPath))`). It now compares the file content against the current `NOTIFY_HOOK_SCRIPT` template and overwrites when they differ:

```typescript
const currentContent = existsSync(hookPath) ? readFileSync(hookPath, "utf-8") : "";
if (currentContent !== NOTIFY_HOOK_SCRIPT) {
  writeFileSync(hookPath, NOTIFY_HOOK_SCRIPT, { mode: 0o755 });
  hookWritten = true;
}
```

This means re-running `insight-flow init` or `insight-flow install-lifecycle-hooks` will update the hook to the current version. Existing installs that pre-date this change will be updated on the next `init` run.

#### 4. Dashboard refactor (`packages/taskflow/src/server/dashboard.ts`)

**Removed:**
- `var prevTaskSnapshot = {}` — the object that tracked previous task statuses for diffing.
- `checkStatusTransitions(newTasks)` call in `loadShard` — the function that diffed snapshots and fired per-status notifications.
- The entire `NOTIF_WATCHED` array and its per-status checkbox iteration (`saveNotifSettings`, `syncSettingsUI` loops, `loadNotifSettings` defaults loop).
- `checkStatusTransitions` function definition (and the no-op stub `function checkStatusTransitions() {}` that was emitted when `browserNotifications` was `false`).
- `fireDesktopNotif(taskId, status, sound)` — the old per-status notification function.

**Simplified:**
- `notifSettings` now carries only `{ sound: boolean, muteFocused: boolean }` — no `statuses` map.
- `loadNotifSettings` reads only `sound` and `muteFocused` from `localStorage`.
- `saveNotifSettings` writes only those two fields.
- `syncSettingsUI` syncs only the Sound and Mute checkboxes.

**Added:**
- `fireDesktopNotif()` (no arguments) — fires a single notification with the fixed message `"<projectName>: Claude finished"`. Respects `muteFocused` (suppresses when tab is focused) and `sound` (silent flag).
- `sock.on('agent-done', function() { fireDesktopNotif(); })` — triggers on the server-emitted event.

**Settings panel HTML:**
The gear icon popover previously showed five per-status checkboxes (`Task implemented`, `Review approved`, `Fix needed`, `Merged`, `Changes requested`) plus Sound and Mute. It now shows only:
- Sound checkbox
- Mute when tab focused checkbox
- Permission hint

### Migration note for existing installs

The `.claude/hooks/taskflow-notify.sh` file in consumer projects will be **stale** after this upgrade — it won't include the `curl` call to `/api/agent-done`. Browser notifications will not appear until the hook is updated.

To update: re-run `insight-flow init` or `insight-flow install-lifecycle-hooks` in the consumer project. The updated `installNotifyHook` will detect the content mismatch and overwrite automatically.

---

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-05-27

### Changes requested

- **Addition** — Add a `REVIEW.md` documentation section that fully documents everything implemented in this task: the new `POST /api/agent-done` server endpoint, the updated `NOTIFY_HOOK_SCRIPT` (curl call + port reading), the `installNotifyHook` overwrite behaviour change, and the dashboard refactor (removal of `checkStatusTransitions` / `NOTIF_WATCHED` / `prevTaskSnapshot`, simplification of `notifSettings` and `fireDesktopNotif`, addition of `sock.on('agent-done', ...)` listener, settings panel HTML change). Documentation should be written as a clear summary suitable for a human reviewer or future contributor — covering what changed, why, and any migration note for existing installs.

### Notes

No source code changes requested — this is purely a documentation addition to REVIEW.md itself.


---

## Round 2

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** approved

### Summary

Replaces noisy per-status browser notifications with a single "Claude finished" signal triggered by the Stop hook. Three source files changed: server endpoint added, hook script extended with curl, dashboard stripped of status-transition machinery. The change request (documentation) was satisfied by the Implementation Summary section added above. Low risk — all new paths are fire-and-forget with silent failure.

### Checklist verification

- [x] `POST /api/agent-done` endpoint added; emits `agent-done` socket.io event — `index.ts:488-492`. Returns `200 { ok: true }` always.
- [x] `taskflow-notify.sh` includes fire-and-forget curl to `/api/agent-done` — `notify-hook.ts:48-54`. Appended after OS notification case block.
- [x] Curl guarded by active task check — `notify-hook.ts:38` (`[ -z "$TASK_ID" ] && exit 0`) runs before the curl at line 54.
- [x] `checkStatusTransitions`, `NOTIF_WATCHED`, `prevTaskSnapshot` removed from dashboard — confirmed absent via grep; no matches.
- [x] `sock.on('agent-done', ...)` added; `fireDesktopNotif` simplified to no args — `dashboard.ts:853` (no-arg function), `dashboard.ts:933` (socket listener).
- [x] `notifications.browser: false` suppresses socket emit — `index.ts:489` guard; endpoint still returns 200.
- [x] `init` / `install-lifecycle-hooks` regenerates hook — `notify-hook.ts:128-131` content-diff check overwrites stale hook on re-run.
- [x] Build passes — `pnpm --dir packages/taskflow run build` clean, no TS errors.
- [x] Change request satisfied — Implementation Summary section added to REVIEW.md covering all four changed areas with migration note.

### Blockers

None.

### Non-blocking

- The `curl -sf` flag combination (`-s` silent, `-f` fail-on-HTTP-error) means a non-2xx response from the server would cause curl to exit non-zero — but the trailing `|| true` absorbs it. Functionally correct; worth knowing if debugging a misconfigured server.
- The `"port"` grep in the hook matches the first `"port":` key in the config file. This works because `server.port` appears before `master.port` in the standard layout, but it's fragile if config key order changes. A future hardening could grep for the `server` object explicitly.

### Security & edge cases

- **`POST /api/agent-done` is unauthenticated** — any localhost process can trigger a browser notification. Acceptable: this server is local-only (`localhost`), and the worst-case impact is a spurious "Claude finished" popup.
- **Non-TTY curl environments**: on some CI/minimal containers `curl` may not be installed. The `|| true` absorbs the resulting non-zero exit, so the Stop hook exits 0 either way — no Claude block risk.

### Notes

- OS notification path (`insight-flow notify`) is unchanged, as required by the "out of scope" clause.
- No regressions: the `notifSettings.sound` reference in `playStatusSound` still works because `notifSettings` is still declared (now `{ sound, muteFocused }`) when `browserNotifications` is true; the `!notifSettings` guard handles the false case.
- Ready to merge.


---

## Round 3 — pending verdict

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**Verdict:** pending

### Summary

### Checklist verification

### Blockers

### Non-blocking

### Security & edge cases

### Notes

---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

approved
