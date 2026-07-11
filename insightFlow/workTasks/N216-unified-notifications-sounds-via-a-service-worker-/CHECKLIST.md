# N216 — Unified notifications + sounds via a service worker on the master origin — Checklist

> Built on the N215 server-rendered shell (`overview.ts`), which already did cross-project notifications from the master origin. N216 upgrades it to a **service worker** + adds **origin sounds** + **per-project mute**.

## Done criteria

- [x] Service worker served at `/sw.js` (master origin, root scope) + registered on load; notifications go through `navigator.serviceWorker.ready → registration.showNotification` (page-`Notification` fallback). SW handles `notificationclick` → focus/navigate the hub (basis for N217 PWA)
- [x] One permission prompt on the master origin (`requestNotifPermission`), reused for all projects
- [x] Shell subscribes to master `/events` (`connectStream`) and maps per-project transitions → `showHubNotification(label + task → status, { url:/p/<id>/ })` (existing `checkStatusTransitions`, now SW-backed)
- [x] Sounds play **from the master origin** — master serves `/sounds/*.mp3`; the shell plays them on notify, with a **Web-Audio beep fallback** (`playTone`); persist across project switches (the hub page is one origin)
- [x] **Per-project mute** stored under the master origin (`notifSettings.mutedProjects` in localStorage `tf-notif-settings`); 🔔/🔕 toggle on each card; muted projects fire no notification/sound. Global sound + per-status toggles already present
- [x] No Web Push / VAPID / OneSignal — SW + Notifications API only

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**336/336**, +1)
- [x] typecheck passes

## Verification

- [x] `/sw.js` → 200 js (has `notificationclick`); `/sounds/idle-ping.mp3` → 200 `audio/mpeg`; `/sounds/evil.txt` → 400 (test + live)
- [x] Overview has SW registration, `showHubNotification`, `playNotifSound`/`playTone`, per-project `toggleMuteProject` (live check)
- [ ] Full in-browser: grant permission once → a backgrounded transition fires a notification + sound; mute a project → silenced — manual, deferred to human review (needs a browser + real transitions; note: repo ships 0-byte mp3 placeholders, so the beep fallback is what's audible locally)
