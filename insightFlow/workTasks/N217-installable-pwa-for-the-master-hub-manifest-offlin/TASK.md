# N217 — Installable PWA for the master hub (manifest + offline shell)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-10

## Problem

Once the hub is a single-origin app shell (N215) with a service worker (N216), the last step is making it an **installable PWA**: the user opens `localhost:<hub>` once, installs it, and thereafter launches **one app** that opens to the overview, switches between projects, and keeps notifications + sounds. Today there is **no manifest, no installability, no offline shell**.

## Goal

1. A **web app manifest** (name, icons, `start_url` = the hub overview, `display: standalone`, theme colors) served on the master origin.
2. The service worker (N216) also provides an **offline app shell** (cache the shell HTML/JS/CSS/icons) so the hub opens instantly and degrades gracefully when a project server is down.
3. The hub is **installable** (Chrome/Edge "Install app"); launching the installed app opens to the overview and the project switcher works.
4. Notifications + sounds (N216) continue to work in the installed/standalone window.

## Scope

### In scope

- `src/master/client/` — add `manifest.webmanifest` + app icons (maskable + standard sizes); link it from the shell HTML; set theme/background colors.
- Extend the N216 service worker with a **cache-first app-shell** strategy for the shell assets (not the proxied project data — those stay network); a versioned cache + cleanup on activate.
- `packages/taskflow/src/master/server.ts` — serve the manifest + icons with correct MIME; ensure `start_url` (overview) and scope are correct for the single origin.
- Consider `vite-plugin-pwa` (or hand-rolled SW) — pick the lighter option consistent with the existing Vite setup.

### Out of scope

- Web Push / background delivery when fully closed (out per analysis).
- Any change to per-project dashboards.
- App-store packaging; this is a browser-installable PWA only.

## Implementation plan

1. **Manifest + icons.** Add `manifest.webmanifest` (name "insight-flow hub", `start_url` = overview, `display: standalone`, theme/bg, icons incl. maskable); link + serve with correct MIME from `master/server.ts`.
2. **App-shell cache.** In the SW (from N216), cache the shell assets (HTML/JS/CSS/icons/sounds) cache-first with a versioned cache; network for `/p/<id>/*` and APIs; clean old caches on `activate`.
3. **Installability.** Verify the install criteria (manifest + SW + HTTPS/localhost exemption) pass; the "Install" prompt appears.
4. **Standalone launch.** Installed app opens to overview; switcher + proxy + notifications + sounds work in the standalone window.
5. **Offline degrade.** With no project running, the shell still loads and shows projects as offline (no white screen).
6. **Verify** in Chrome DevTools → Application (manifest valid, SW active, installable).

## Verification

- DevTools → Application: manifest valid, service worker active, "installable" ✅.
- Install the hub; launch it standalone → opens to overview; switch to an online project; a notification + sound fire.
- Kill all project servers, reload the installed app → shell still loads (offline), projects shown offline.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 5 — capstone.** **Depends on [[N215]] (single-origin shell) and [[N216]] (service worker).**
- Keep it local-first: cache only the shell; never cache project data (it's live).
- This is the "one localhost, switch projects, notifications + sounds persist" end state the user asked for.
