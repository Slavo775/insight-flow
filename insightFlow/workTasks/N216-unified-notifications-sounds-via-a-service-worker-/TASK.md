# N216 — Unified notifications + sounds via a service worker on the master origin

**Type:** feat
**Priority:** medium
**Created:** 2026-07-10

## Problem

Notifications + sounds are **per-tab, per-project** today (`dashboard/client/notifications.ts`: browser `Notification` API + Web Audio, localStorage). With N+ projects that means N permission prompts and sounds that don't persist when you switch project. Once the hub is single-origin (N215), we can have **one service worker on the master origin** that shows notifications + plays sounds for **all** projects — one permission, persistent across switching, works while the app is backgrounded. (Decision: **Service Worker + Notifications API only — no external push service**; alerts fire while the app is open or backgrounded, not when fully closed.)

## Goal

1. A **service worker** on the master origin that owns notifications for every registered project (task done, approval needed, status changes).
2. **One** notification permission prompt (master origin), reused for all projects.
3. **Sounds persist** across project switches (played from the master shell / SW, not the per-project iframe/tab).
4. Master **aggregates** project events (it already receives every project's status/state pushes) and drives the SW to notify; per-project mute/sound settings still respected.

## Scope

### In scope

- New service worker under `src/master/client/` (registered by the N215 shell); a `showNotification` path driven by master events; optional `Notification` from the page when SW not needed.
- `packages/taskflow/src/master/server.ts` — ensure the event stream the shell subscribes to carries the notify-worthy transitions (done / awaiting-permission / status) per project (reuse `/events` + status pushes).
- Port the notification + sound logic from `dashboard/client/notifications.ts` into a **master-origin** module the shell/SW use; keep per-project settings (mute/sound) but store them under the master origin.
- Sound assets served from the master origin (reuse the bundled mp3s).

### Out of scope

- **Web Push / VAPID / OneSignal** (fully-closed delivery) — explicitly out (analysis decision).
- The per-project dashboard's own in-tab notifications may remain for standalone use; unification is at the hub.
- PWA manifest/installability (N217).

## Implementation plan

1. **SW scaffold.** Add a service worker to the master shell (N215); register on load; handle a `notify` message / push-from-page to `registration.showNotification`.
2. **Event → notify.** In the shell, subscribe to master `/events`; map per-project transitions (`done`, `awaiting-permission`, status) to notifications with the project label; respect mute/sound settings.
3. **Sounds.** Play from the shell/SW on the master origin using the bundled mp3s (Web-Audio fallback), so switching project doesn't reset audio; settings under the master origin (localStorage).
4. **Permission.** One request flow on the master origin; show current state (like the existing `notificationStatusText`).
5. **Settings UI.** Per-project mute/sound toggles in the shell (reuse existing settings shape).
6. **Tests.** Event→notification mapping (unit); settings persistence.

## Verification

- Grant permission once on the master origin → notifications fire for **any** project's `done` / `awaiting-permission` while the hub is open or backgrounded.
- Switch project → a sound triggered by project A still plays; no second permission prompt.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 4.** **Depends on [[N215]] (single origin)** — this is the payoff of the reverse-proxy decision.
- Reuse, don't reinvent: port `dashboard/client/notifications.ts` logic to the master origin.
- Feeds [[N217]] (a SW is also the basis for PWA offline/installability).
