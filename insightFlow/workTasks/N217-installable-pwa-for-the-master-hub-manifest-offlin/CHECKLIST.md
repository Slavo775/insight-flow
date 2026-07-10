# N217 — Installable PWA for the master hub (manifest + offline shell) — Checklist

## Done criteria

- [ ] `manifest.webmanifest` served on the master origin (name, `start_url`=overview, `display: standalone`, theme/bg, icons incl. maskable)
- [ ] Service worker (from N216) caches the app shell (HTML/JS/CSS/icons/sounds) cache-first, versioned, cleaned on `activate`
- [ ] `/p/<id>/*` and APIs stay network (never cached as data)
- [ ] Hub is installable (DevTools → Application shows installable)
- [ ] Installed/standalone launch opens to overview; switcher + notifications + sounds work
- [ ] Offline: shell still loads with all project servers down (projects shown offline, no white screen)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] typecheck passes

## Verification

- [ ] DevTools → Application: manifest valid, SW active, "installable" ✅
- [ ] Install + launch standalone → overview → switch to online project → notification + sound fire
- [ ] Kill all project servers, reload installed app → shell loads offline
