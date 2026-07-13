# N217 — Installable PWA for the master hub (manifest + offline shell) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** fix-needed

## Summary

Turns the hub into an installable PWA: a valid manifest (`start_url /`, `display standalone`, theme/bg, SVG icons incl. a maskable one) served + linked in the shell `<head>`, and the N216 SW extended with an app-shell cache — network-first for `/` (fresh online, cached offline), cache-first for static assets, versioned cache pruned on activate, and `/p/*`, `/api/*`, `/events` never cached. Well-scoped, additive, 337/337. **One blocker:** the navigate branch caches the shell response without an `res.ok` guard, so a failed top-level navigation poisons the offline shell.

## Checklist verification

- [x] `manifest.webmanifest` served + linked (`start_url /`, standalone, theme/bg, maskable SVG icon) — verified.
- [x] SW app-shell: network-first `/`, cache-first assets, versioned (`if-hub-v1`), cleaned on activate — verified.
- [x] `/p/*`, `/api/*`, `/events` never cached (early return) — verified.
- [x] Installable prerequisites present (manifest + SW + standalone + icons).
- [x] Notifications/sounds (N216) intact on the one origin.
- [ ] **Offline shell integrity** — undermined by Blocker 1.

## Blockers

1. **The offline shell can be poisoned by a non-OK navigation (no `res.ok` guard).**
   - **Where:** `packages/taskflow/src/master/server.ts` — `MASTER_SW_JS`, the `fetch` handler's navigate branch: `fetch(e.request).then(function(res){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put('/', copy); }); return res; })`.
   - **Why:** it caches the response under `/` for **any** status. A top-level navigation to a path that isn't `/`, `/overview`, `/p/*`, `/api/*`, or `/events` (a typo, a stale bookmark, a removed route) returns the master's **404**, which then gets stored as the offline shell — so going offline right after serves that 404 (a broken shell) instead of the overview. The static-asset branch already guards on `res.ok`; the navigate branch doesn't. (It self-heals on the next successful navigation, but the window is real and it's the headline feature.)
   - **Fix:** only cache OK navigations under `/`:
     ```js
     fetch(e.request).then(function(res){
       if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put('/', copy); }); }
       return res;
     }).catch(function(){ return caches.match('/'); })
     ```

## Non-blocking

1. **SVG-only icons + installability.** Modern Chrome accepts an SVG icon (`sizes: "any"`) for install, so this is fine for the target (localhost Chrome). Some stricter contexts still want a PNG 192 + 512; if a target browser doesn't offer Install, add PNGs. Documented in the checklist.
2. **Static-asset cache invalidation.** Icons/sounds/manifest are cache-first, so a change to them only ships after bumping the cache version (`if-hub-v1`). Fine, but note it — the shell HTML is network-first so it refreshes on its own; the *assets* need the version bump.
3. **Flaky test (shared with the suite).** The new N217 test binds a random port and hit a transient `EADDRINUSE` once in a full run (passed on retry) — same pattern as the other master tests (memory: master tests are flaky). Consider a bind-retry helper for the whole family later.

## Security & edge cases

- Manifest + icons are static, public, no user data — serving them on all interfaces is harmless.
- SW is same-origin only (`url.origin !== self.location.origin` → network); it never caches `/p`/`/api`/`/events`, so live/proxied data is never stale-served.
- No Web Push (as decided).

## Notes

- **Roadmap Phase 5 — the capstone.** Completes the single-origin PWA hub (N212–N217) on `dashboard-improvements`.
- In-browser install / standalone / offline-reload is manual, deferred to human review.
- Gates: build ✅ · `test:node` **337/337** ✅ · typecheck ✅. The blocker is a 1-line `res.ok` guard.

---

## Fix (2026-07-11, task-review-fix)

- **Blocker 1 — resolved.** The SW navigate branch now caches the shell under `/` **only when `res.ok`** — a 404/500 top-level navigation can no longer poison the offline shell (matches the static-asset branch). Verified in the served `/sw.js`.
- **Non-blockings — left as documented:** SVG-only install caveat (fine for localhost Chrome; add PNGs only if a stricter browser is targeted), static-asset cache-version discipline (bump `if-hub-v1` when icons/sounds change), and the flaky random-port test (shared with the whole master-test family — a bind-retry helper is a separate cleanup).
- **Gates:** build ✅ · typecheck ✅ · `test:node` **337/337** ✅.


---

## Round 2 — AI re-review (fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

Blocker fixed and verified. **Approved.**

### Checklist verification

- [x] **Blocker fixed:** the SW navigate branch caches `/` only when `res.ok` — confirmed in the served `/sw.js`; a 404/500 navigation no longer poisons the offline shell. Offline shell integrity restored.
- [x] All original N217 features unchanged (manifest, icons, cache-first assets, `/p`/`/api`/`/events` never cached, notifications/sounds intact).

### Blockers

- None.

### Non-blocking

- SVG-only install caveat, static-asset cache-version discipline, flaky random-port test — all left as documented (design trade-off / maintenance note / pre-existing suite pattern).

### Security & edge cases

- SW same-origin only; live/proxied surfaces never cached; manifest/icons public static. No concern.

### Notes

- **The single-origin PWA hub (N212–N217) is complete** on `dashboard-improvements`. Gates: build ✅ · `test:node` **337/337** ✅ · typecheck ✅. Ready for human review → merge; then the whole batch → `main` + release.


---

## Round 3 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-11
**Verdict:** approved

### Summary

"proceed" — human sign-off on the installable PWA (after the offline-shell `res.ok` fix). Lands into `dashboard-improvements`, completing the N212–N217 single-origin PWA hub.

### Blockers

None.

### Notes

- Phase 5 (capstone) complete. The whole hub batch is now ready to merge to `main` + release.
