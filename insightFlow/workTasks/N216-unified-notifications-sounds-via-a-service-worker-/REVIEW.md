# N216 — Unified notifications + sounds via a service worker on the master origin — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** approved

## Summary

Cleanly upgrades the N215 shell's existing cross-project notifications to a **service worker**: the master serves `/sw.js` (root scope, `Service-Worker-Allowed: /`), the shell registers it and routes notifications through `serviceWorker.ready → registration.showNotification` (page-`Notification` fallback), so alerts fire while the hub is backgrounded and it's the basis for the N217 PWA. Sounds now come **from the master origin** (`/sounds/*.mp3`, traversal-guarded) with a Web-Audio beep fallback, and a per-project 🔔/🔕 mute is persisted under the master origin. SW + Notifications API only — no Web Push. 336/336. No blocker.

## Checklist verification

- [x] SW served at `/sw.js` + registered; notifications via `registration.showNotification`; `notificationclick` focuses/navigates the hub — verified (route + shell string checks).
- [x] One permission prompt (`requestNotifPermission` → `Notification.requestPermission()`, once, localStorage-guarded).
- [x] Shell maps `/events` transitions → `showHubNotification(label + task→status, {url:/p/<id>/})` — existing `checkStatusTransitions`, now SW-backed.
- [x] Sounds from the master origin + Web-Audio fallback (`playTone`) — `/sounds/*.mp3` served; `playNotifSound` plays, falls back.
- [x] Per-project mute stored under the master origin (`notifSettings.mutedProjects`); muted → no notify/sound.
- [x] No Web Push / external.

## Blockers

None.

## Non-blocking

1. **`showHubNotification` hangs (no fallback) if SW registration fails.** It gates on `navigator.serviceWorker && navigator.serviceWorker.ready` — but `.ready` is a Promise that *never resolves* if registration failed (it doesn't reject), so the `.catch` fallback to `new Notification` won't run and no notification fires. On localhost (a secure context) the SW registers fine, so this is only a rare-browser edge — but it's a silent regression vs N215's direct `new Notification`. Harden by tracking a "SW ready" flag (set in the `register().then`) and using the page `Notification` when it's not set, or race `.ready` against a short timeout.
2. **Notification is always `silent:true` + we play our own sound.** Deliberate (origin mp3s), but means an OS-default notification sound is never used even if the user's browser would prefer it. Fine for the design; noted.
3. **`/sounds/` uses sync `readFileSync` per request.** Small, infrequent files — negligible; could cache/stream if it ever matters.
4. **`window.event` in `toggleMuteProject`/`playNotifSound`.** Non-standard but Chrome-only tool and consistent with the existing overview code.
5. **Repo ships 0-byte mp3 placeholders**, so locally the audible cue is the Web-Audio beep fallback, not the mp3. Content issue, not code — the route + playback plumbing are correct.

## Security & edge cases

- **`/sounds/` traversal-safe:** rejects `..`, `/`, non-`.mp3`, and re-checks the resolved path stays under the sounds dir (verified `..%2fpackage.json` → 400). Read-only public assets; serving them on all interfaces is harmless.
- SW is a static script; `notificationclick` only navigates/opens same-origin (`/p/<id>/` or `/`).
- Permission requested once; `mutedProjects`/settings live under the master origin (localStorage).

## Notes

- **Roadmap Phase 4**, on `dashboard-improvements`. The SW added here is the base for **N217** (PWA — manifest + offline shell cache).
- Full in-browser flow (grant → backgrounded transition → notification + sound; mute silences) is manual, deferred to human review.
- Gates: build ✅ · `test:node` **336/336** ✅ · typecheck ✅.

---

## Post-approval hardening (2026-07-11, "fix all issues")

- **NB1 — resolved.** `showHubNotification` no longer gates on the never-rejecting `serviceWorker.ready` promise. A module-level `swReg` is set only once the SW is **active** (`register().then(() => serviceWorker.ready).then(reg => swReg = reg)`); the notify path uses `swReg.showNotification` when set and otherwise falls back to a page `Notification` immediately — so a failed SW registration can't silently swallow notifications. build ✅ · 336/336 ✅ · typecheck ✅.
- **NB2–NB5 — no code change (by design / not defects):** silent-by-design notification (we play our own origin sound) is intentional; `readFileSync` on `/sounds` is negligible for tiny files; `window.event` matches the existing overview code (changing one call would be inconsistent); the 0-byte mp3s are shipped placeholders (content, not code) — the route + Web-Audio fallback are correct.


---

## Round 2 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

"approved continue" — human sign-off on the unified SW notifications + origin sounds + per-project mute (incl. the NB1 hardening). Merges into `dashboard-improvements`.

### Blockers

None.

### Notes

- Phase 4 complete. The SW is the base for N217 (the final task: installable PWA).
