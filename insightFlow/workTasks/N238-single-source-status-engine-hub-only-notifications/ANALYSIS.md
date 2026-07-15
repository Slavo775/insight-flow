# N238 — Analysis (pre-taskmaster audit trail)

Produced by `/task-analyze` before handoff. Records how the scope was reached.

## Problem framing

Investigation started from "PWA notifications + sounds don't work" (service worker confirmed running at `localhost:6100`). Iterative debugging with the user established a chain of causes, ruling out the obvious ones:

- **Not HTTP/secure-context.** `localhost` is a secure context even over HTTP; the SW registering proves it. (The one place HTTP breaks it is LAN-IP access from a phone — N223 territory, not this task.)
- **Not architecture.** The user proposed "centralize notifications + sound in master, remove from project." That is **already shipped** (N216/N217/N225): `/hub-notify.js` on the master origin is the single SW-backed authority, and the project client already suppresses its own notifications under the proxy (`notifications.ts` `underHub()`).
- **Was: notification permission** — user had not granted it (fixed by allowing).
- **Then: no transition.** With permission granted, the user's own `/events` capture showed two frames both `claudeStatus:"active"`, `currentTaskStatus:"fix-needed"` — a steady state. Notifications fire only on a change, so nothing fired (correct).
- **Real root cause:** the status-derivation model is fragile, and the notification logic is duplicated.

## Root cause

1. **Fragile derivation.** `deriveStatus` (`dashboard/server/event-stream.ts:40`) = `map(single latest event)`, no lifecycle state machine. Concrete bugs: `SubagentStop → "done"` (line 14) flips the project to done mid-work; permission is non-sticky so a later tool event overwrites `awaiting-permission` back to `active` ("stuck active"). Permission detection also leans on a `/permission/i` regex over `Notification` text (line 20).
2. **Duplicated notification logic** across `dashboard/client/notifications.ts` (TS), `master/server.ts` `MASTER_NOTIFY_JS` (served string blob), and `master/client/notif.ts`. Already drifted: `notif.ts` watches 5 statuses, `MASTER_NOTIFY_JS` watches 8 → three statuses fire with no toggle.

## Goal

Deterministic, single-source status + notification logic; reliable "Claude finished" / "needs permission" signals through the hub; no duplicated logic.

## Options considered

- **Transport rewrite (rejected).** SSE + hooks are the right, deterministic source; Claude Code has no pollable status API. The bug is derivation, not transport.
- **Move derivation to master (rejected).** Raw `.claude/hooks` POST to the project server; master never sees them. Moving derivation would force every project to pipe raw hooks to master and make master a single point of failure. Keep derivation project-side; put its *logic* in `core/`.
- **Minimal 3-bug patch (rejected by user).** Fix `SubagentStop`, sticky permission, stuck-active timeout only. 80% of the win, smaller diff, but keeps the fragile last-event core. User chose the full state machine.
- **Delete project-side notifier vs extract shared module.** User confirmed always-hub access → **delete** the project notifier (lazy DRY win), and un-blob the hub notifier into a real shared module.

## Decision

Full lifecycle state machine in `core/` (turn + sticky permission, `SubagentStop` ignored, only real `Stop` = finished, stuck-active decay, `tool_use_id` correlation) + delete project-side notifier + un-blob `MASTER_NOTIFY_JS` into one bundled module with a single `NotifSettings`/`WATCHED` + docs recommending the hub. One combined, phased task (Phase 1 can ship alone).

User-confirmed choices: full state machine; only real `Stop` = finished (idle stays active); always-hub, recommend in docs; one combined task; silent-when-direct is an accepted, documented limitation.

## Open questions (for implementation)

- Which hook actually delivers the permission signal on the current Claude Code version — `Notification` (stock) vs the `PermissionRequest` name present in the code? Key the machine off the real one.
- Value of N for the stuck-active decay timeout (pick a sane default, e.g. a few minutes).
- Whether `updatePageTitle` / badge visuals stay in `notifications.ts` or move to a small util once the firing code is deleted.

## Sources

- `packages/taskflow/src/dashboard/server/event-stream.ts` (deriveStatus/statusFromEvent/EventStore)
- `packages/taskflow/src/dashboard/client/notifications.ts`, `useDashboardStream.ts`, `App.tsx`
- `packages/taskflow/src/master/server.ts` (`MASTER_NOTIFY_JS`, `/hub-notify.js`, `/sw.js`, `/events`)
- `packages/taskflow/src/master/client/notif.ts`, `SettingsMenu.tsx`; `master/registry.ts` (updateStatus, VALID_STATUSES)
- `packages/taskflow/src/core/activity-status.ts` (`claudeStatusFromProjectStatus`)
- `packages/taskflow/src/dashboard/server/index.ts` (`pushStateToMaster`/`pushStatusToMaster`/`pushOnChange`)
- User-provided: DevTools service-worker panel, `showNotification` test (worked), `/events` capture (steady active state).

## Handoff brief

Rework, high priority. Replace last-event-wins status derivation with a deterministic lifecycle state machine in `core/`; delete the project-side notifier (hub-only delivery); convert the `MASTER_NOTIFY_JS` string blob into one shared bundled module (single `NotifSettings` + `WATCHED`); document hub-recommended access. See TASK.md / CHECKLIST.md (phased: engine → delete project notifier → un-blob hub module → docs).
