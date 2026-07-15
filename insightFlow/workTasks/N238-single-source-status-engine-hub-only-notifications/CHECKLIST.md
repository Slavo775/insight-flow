# N238 — Single-source status engine + hub-only notifications (deterministic + DRY) — Checklist

## Done criteria

### Phase 1 — deterministic status engine (core/)
- [x] New lifecycle state-machine module added under `packages/taskflow/src/core/` (`status-machine.ts`)
- [x] `turn` dimension: `Stop` (main) → finished; `SubagentStop` no longer flips to `done`
- [x] `permission` is sticky: set on the permission signal, cleared only by the next PreToolUse/PostToolUse/Stop
- [x] Idle/pause stays `active`; only a real `Stop` = finished
- [x] Stuck-active decay (working + no events for 5 min → idle) implemented + a decay-push tick
- [~] `tool_use_id` correlation — evaluated, NOT needed: with `SubagentStop` ignored, subagent tool events correctly keep the session `active`, and the timestamp-ordered fold means a subagent event can't override a later main `Stop`. No nesting signal to correlate against → would be dead code. (Flagged for human.)
- [x] `event-stream.ts` (`deriveStatus`/`statusFromEvent`/`EventStore`) rewired to the core machine
- [x] Permission handled via both the `Notification` (permission wording) and legacy `PermissionRequest`/`approval-required` signals

### Phase 2 — delete project-side notifier
- [x] Notification/sound firing removed from `dashboard/client/notifications.ts` (now only `updatePageTitle`)
- [x] Calls removed from `useDashboardStream.ts` and `App.tsx`
- [x] `underHub()` suppression removed (whole firing layer gone)
- [x] Project dashboard Sound/Mute settings UI removed; visual badge + `updatePageTitle` kept

### Phase 3 — one hub notification module
- [x] `MASTER_NOTIFY_JS` string blob replaced by a real built module (`src/master/client/hub-notify.ts` → `dist/master/hub-notify.js`) served at `/hub-notify.js`
- [x] Single `NotifSettings` type shared across the module and `master/client/notif.ts`
- [x] Single `WATCHED` list (5-vs-8 drift bug fixed; toggles match watched statuses)

### Phase 4 — docs
- [x] README / dashboard docs recommend the hub (`:6100`)
- [x] Silent-when-direct (or master-down) documented as an intended limitation

## Quality gates

- [x] `pnpm build` passes (CLI + both client bundles + hub-notify)
- [x] `pnpm --dir packages/taskflow test` passes (360/360; typecheck + eslint clean, 0 errors)
- [x] No regressions in the dashboard/master status + notification path

## Verification

- [x] Unit: subagent finishing mid-work does NOT flip to `done` (deriveStatus test)
- [x] Unit: pending permission is sticky until a resolving event (deriveStatus test)
- [x] Unit: real `Stop` → `done`; stuck-active decay → `idle` (deriveStatus tests)
- [x] `/hub-notify.js` serves the built module (getHubNotifyJs reads `dist/master/hub-notify.js`); built bundle contains the unified 8-status list + notify logic
- [x] Built project SPA no longer ships notification sounds; live hub-open behavior to be confirmed in manual review
