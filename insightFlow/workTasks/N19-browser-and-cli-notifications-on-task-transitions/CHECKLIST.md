# N19 — Browser and CLI notifications on task transitions — Checklist

## Done criteria

- [ ] `TaskflowConfig.notifications: { browser: boolean; cli: boolean }` exists with defaults `true / true`.
- [ ] Dashboard diffs successive shard snapshots, detects status changes for watched statuses, fires `Notification` API with title `<projectName>: <taskId> → <status>`.
- [ ] Top-bar settings popover lets user toggle per-status notifications, sound on/off, mute-while-focused; persisted to `localStorage`.
- [ ] Permission flow handles `Notification.permission === "default"` with a one-time prompt; respects user denial gracefully.
- [ ] `insight-flow notify "<message>"` subcommand exists with `--title` and `--project` flags.
- [ ] CLI subcommand auto-detects platform: `osascript` (macOS), `notify-send` (Linux), PowerShell (Windows); swallows all errors.
- [ ] CLI subcommand exits in <100 ms whether the OS handler succeeded or not.
- [ ] When `notifications.cli: false`, CLI subcommand exits 0 silently without invoking any OS handler.
- [ ] Canonical role files have a "WHEN TO NOTIFY" section listing the four milestones.
- [ ] `insight-flow init` omits the "WHEN TO NOTIFY" section from per-project role-file copies when `notifications.cli: false`.
- [ ] README has a "Notifications" section documenting both halves and the config keys.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes.
- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes (existing + new `notify.test.mjs`).
- [ ] No regression in `insight-flow ui` startup time (≤ 500 ms to first paint).

## Verification

- [ ] Manual: change task status with dashboard tab in background, OS notification within ~1 s on macOS.
- [ ] Manual: `insight-flow notify "test"` from terminal → OS notification, exit <100 ms.
- [ ] Manual: `notifications.cli: false` → `insight-flow notify "test"` exits silently, no OS notification.
- [ ] Manual: `notifications.cli: false` in init → role-file copies omit WHEN TO NOTIFY section.
- [ ] Manual: deny `Notification` permission in browser → no notifications fire, no console errors.
