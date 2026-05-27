# N52 — browser notification on agent done replaces status transition notifs — Review

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-05-27

### Changes requested

- **Addition** — Add a `REVIEW.md` documentation section that fully documents everything implemented in this task: the new `POST /api/agent-done` server endpoint, the updated `NOTIFY_HOOK_SCRIPT` (curl call + port reading), the `installNotifyHook` overwrite behaviour change, and the dashboard refactor (removal of `checkStatusTransitions` / `NOTIF_WATCHED` / `prevTaskSnapshot`, simplification of `notifSettings` and `fireDesktopNotif`, addition of `sock.on('agent-done', ...)` listener, settings panel HTML change). Documentation should be written as a clear summary suitable for a human reviewer or future contributor — covering what changed, why, and any migration note for existing installs.

### Notes

No source code changes requested — this is purely a documentation addition to REVIEW.md itself.
