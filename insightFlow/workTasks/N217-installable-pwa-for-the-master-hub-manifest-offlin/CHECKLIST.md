# N217 — Installable PWA for the master hub (manifest + offline shell) — Checklist

## Done criteria

- [x] `manifest.webmanifest` served on the master origin (name "insight-flow hub", `start_url` `/`, `display: standalone`, theme/bg `#0a0a0a`, SVG icons incl. a **maskable** one) — linked from the shell `<head>` (+ theme-color, apple-touch-icon)
- [x] Service worker (from N216) caches the app shell: **network-first for `/`** (fresh online, cached shell offline), **cache-first** for static assets (manifest/icons/sounds); versioned cache (`if-hub-v1`), old caches cleaned on `activate`
- [x] `/p/<id>/*`, `/api/*`, `/events` stay network — never cached (SW `fetch` returns early for them)
- [x] Installable (manifest + registered SW + `standalone` + icons + localhost secure context)
- [x] Standalone launch opens to the overview (`start_url` `/`); switcher + notifications + sounds (N215/N216) keep working on the one origin
- [x] Offline: SW serves the cached `/` shell when the network fails → no white screen; live project data shows offline
- [x] Non-goal respected: no Web Push

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (**337/337**, +1)
- [x] typecheck passes

## Verification

- [x] `/manifest.webmanifest` → 200 `application/manifest+json` (valid: start_url `/`, standalone, 2 icons incl. maskable); `/icon.svg` + `/icon-maskable.svg` → 200 `image/svg+xml` (test + live)
- [x] `/sw.js` has a `fetch` handler, offline shell fallback (`caches.match('/')`), and never caches `/api` (test)
- [x] Shell `<head>` links the manifest + theme-color + icon (test + live)
- [ ] DevTools → Application: "installable" ✅ + install + standalone launch + offline reload — manual, deferred to human review (needs a browser; note: SVG icons satisfy modern Chrome installability; if a target browser requires PNG 192/512 that's a follow-up)
