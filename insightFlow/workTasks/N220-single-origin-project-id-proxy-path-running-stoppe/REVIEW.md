# N220 — Single-origin /project/<id> proxy path + running/stopped split — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-11
**PR:** (no PR yet — branch `feat/N220-single-origin-project-path`)
**Verdict:** fix-needed

## Summary

The canonical `/project/<projectId>/*` proxy, the `/p/<id>` → `/project/` 301 redirect, the SW never-cache + `v3` bump, and the Running/Stopped split all work and are verified (live + tests). **Security is clean** — an independent pass found no header-injection, open-redirect, SSRF, XSS, or cache-poisoning (all encode/escape/loopback guards intact). One **regression** was introduced by switching the overview to a full re-render on every update: it destroys the in-flight "Start" button and can double-spawn a dashboard. REQUEST CHANGES for that; two minor items are non-blocking. Risk: medium (functional interaction regression; the routing/security core is solid).

## Checklist verification

- [x] `/project/<projectId>/*` proxies (resolve by `projectId`, then `id`) — pass (live: base injected, assets 200)
- [x] `<base>` / `__IF_BASE__` / asset rewrite use `/project/<projectId>/` — pass
- [x] `/p/<id>/*` 301-redirects to canonical (unknown → friendly 404) — pass (live: `/p/<uuid>/kanban` → 301 `/project/insight-flow/kanban`, query preserved)
- [x] SW never-caches `/project/*`; `CACHE` → `if-hub-v3` — pass (verified in source; activate prunes v2)
- [x] Open link + `startProject` + notification URL use `/project/<projectId>/` — pass
- [~] Overview Running/Stopped sections (empty hidden) — pass functionally, **but** the re-render mechanism regresses interactivity (Blocker 1)
- [x] typecheck / eslint / tests (342, +2; N212 proxy test updated) — pass

## Blockers

1. **Full re-render on every `project-update` destroys the in-flight "Start" button and enables a double-spawn.**
   `master/overview.ts` — `upsertProject` (l.390–393) and `refreshStaleCards` (l.384–386) now call `renderSections()`, which does `grid.innerHTML = …` (l.364), rebuilding *every* card on *every* SSE update. Previously `upsertProject` did a targeted `existing.outerHTML = renderCard(p)` for just the changed card.
   **Why:** `startProject` (l.267–282) sets the clicked button to `Starting…`/disabled and holds it in a `btn` closure for up to 15s. While a spawn is in flight, any *other* project pushing an update (activity frames stream frequently during active Claude work) triggers `renderSections()` → the `Starting…` button is destroyed and re-rendered from `PROJECTS` (still `online:false`) as a fresh enabled `Start →`. The user can now click Start again, and `/api/hub/projects/:id/start` has **no in-flight guard** (`server.ts:772` only short-circuits when `entry.online && entry.url`, which isn't true mid-spawn) → the second click runs `findFreePort` (l.780) and spawns a **second** dashboard process on another port. Also loses hover / text-selection / activity-tooltip state on each rebuild.
   **Fix:** restore targeted per-card DOM updates for same-section updates; only call `renderSections()` when a card crosses the online↔offline boundary (a real section move) or is new — and preserve (don't rebuild) a card whose Start is in flight. Optionally also add a server-side in-flight guard on `/start` (belt-and-suspenders against double-spawn).

## Non-blocking

1. **`/project/` resolves by `getAll().find(e => e.projectId === pid)`** (`server.ts:431`) rather than the authoritative `projectIdIndex`. If `upsert`'s path-match re-key (`registry.ts:38–41`) ever leaves two entries sharing a `projectId`, `find` returns the first-inserted (possibly stale/offline) entry and proxies to it (502) while the live one is ignored. Suggest a `registry.getByProjectId(pid)` that resolves through `projectIdIndex`, and use it here.
2. **`/p/<id>/hub/*` 301-redirects instead of 404** (`server.ts:443`). Net-safe (a browser follows to the `/project/` `/hub/*` guard → 404), but a non-redirect-following client gets a 301 that confirms the projectId. Apply the same `/hub` prefix check in the legacy handler before redirecting.
3. **The 301 sets no `Cache-Control`** (`server.ts:453`); browsers cache 301s aggressively. If a `projectName` is later reused by a different local project, a stale cached `/p/<old-uuid>` redirect resolves to the new owner of that `projectId`. Add `Cache-Control: no-store` to the 301. (Only ever lands on a loopback-guarded same-origin target — a correctness nicety, not a vuln.)

## Security & edge cases

Independent security pass: **no findings.** Verified defended:
- `Location` header: `encodeURIComponent(projectId)` + WHATWG-parsed `restPath`/`search` (control bytes percent-encoded) + Node `writeHead` `ERR_INVALID_CHAR` backstop → no response-splitting.
- Open redirect: value is always the literal `/project/…` prefix; a hostile `projectId` like `//evil.com` becomes `/project/%2F%2Fevil.com…` (same-origin).
- SSRF: `/project/` still calls `proxyToProject`, which enforces `isLoopbackHost` (403 otherwise); `/api/register` still localhost-only; N219 `/hub/*` no-proxy guard preserved (test asserts `proxy-evil` → 403).
- XSS via projectId in `<base>`/asset-rewrite: `encodeURIComponent` + `escapeHtmlAttr` + `JSON.stringify().replace(/</,'\\u003c')`; `encodeURIComponent` also encodes `$`, so the `String.replace` replacement-pattern can't be abused.
- SW/301 cache poisoning: `/p/` is never-cached by the SW; the nav branch only caches `/` on `res.ok`, so a 301 can't poison the offline shell.

## Notes

- The full-re-render was the "simplest" approach named in TASK.md, but it has a real interaction cost — hence the blocker with a targeted-update fix.
- projectId encoding round-trip, redirect Location well-formedness, `respondNoProject` branch parity, and `p.projectId` presence on client objects (via `toPublicView`) were all checked and are correct.
- Next: `/task-review-fix` for Blocker 1 (localized to `overview.ts`, optional `server.ts:/start` guard), then re-review.

---

## Fixes applied (task-review-fix, 2026-07-12) — "Fix all"

**Blocker 1 — re-render regression + double-spawn → FIXED** (`overview.ts` + `server.ts`).
- Overview: `upsertProject` now does a **targeted per-card update** (`node.outerHTML = renderCard(p)`) when a card stays in the same section, and only calls `renderSections()` when a card is new, its node is missing, or it crosses the online↔offline boundary — so other cards' DOM (in-flight Start button, hover, selection, tooltips) is preserved.
- The "Starting…" state is now tracked in `startingIds` and re-applied by `applyStartingState()` after every render (targeted or full), so it survives any re-render and the button stays disabled — no lost state, no accidental double-click.
- Server: `POST /api/hub/projects/:id/start` now dedups with an in-flight `startingProjects` set — a concurrent start returns `202 {starting:true}` instead of spawning a second dashboard. Verified live: two concurrent starts → one `202 {starting:true}`, one `200 {url}`, a single process spawned.

**Non-blocking 1 — projectId lookup → FIXED.** Added `registry.getByProjectId(pid)` (resolves via `projectIdIndex`); the `/project/` route uses it (`getByProjectId ?? getById`) so a stale duplicate can't shadow the live entry.

**Non-blocking 2 — `/p/<id>/hub/*` → FIXED.** The legacy handler now applies the same `/hub` prefix check → **404** directly (no 301-hop). Verified live + test.

**Non-blocking 3 — 301 caching → FIXED.** The `/p/`→`/project/` 301 now sends `Cache-Control: no-store`. Verified live + test.

**Gates:** typecheck clean, eslint clean, `npm test` → **342** (N220 test extended to assert `no-store` + legacy `/hub` 404). Server behaviors re-verified live.

**Verdict after fixes:** ready for re-review.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

Round-1 blocker and all three non-blocking items are verified fixed. Re-review found **one new minor issue** introduced by the fix, which was fixed in this round (per "fix all issues including non-blocking"). Now clean. APPROVE.

### Checklist verification

- [x] **Blocker 1 (re-render + double-spawn) resolved** — `upsertProject` does targeted per-card updates (`node.outerHTML = renderCard(p)`) and only `renderSections()` on section move / new / missing node (overview.ts:421–433); `startingIds` + `applyStartingState()` keep the "Starting…" button disabled across renders; server `/start` dedups via `startingProjects` (server.ts) → `202 {starting:true}`. Live-verified: two concurrent starts → one 202, one 200, single process.
- [x] **Non-blocking 1** — `registry.getByProjectId` (via `projectIdIndex`); `/project/` uses `getByProjectId ?? getById`.
- [x] **Non-blocking 2** — `/p/<id>/hub/*` → 404 (test + live).
- [x] **Non-blocking 3** — 301 `Cache-Control: no-store` (test + live).
- [x] typecheck / eslint / tests → **342** pass.

### Blockers

None.

### Non-blocking

None outstanding. (The item below was found and fixed during this round.)

### Security & edge cases

- **New issue found + fixed this round:** `startingIds[id]` was cleared on failure/navigation but not when the project came online, so a tab that didn't navigate (the `202` dedup path, or a start that never registered) leaked the flag → a *later* Stop would render a wrongly-disabled "Starting…" button. Fixed two ways (overview.ts): (a) `upsertProject` clears `startingIds[p.id]` when the project goes online (the natural "start finished" signal, works across tabs), and (b) `startProject` sets a 20s safety timeout that clears the flag if still set (bounds the failed-start / 202 case). Verified bundled into the served output.
- Everything else from Round 1 stands: no header-injection / open-redirect / SSRF / XSS / cache-poisoning; loopback + `/hub/*` guards intact.

### Notes

- The `startProject(id)` id (sanitized) equals the registry UUID `data-id` for real ids, so `startingIds` keys, the `data-id` selector, and the `/start` endpoint all line up.
- Next (gated): human review, then `/task-git`.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-12
**Verdict:** approved

### Notes

> Do by recommendation

Approved — land N220 per the recommended flow (human-review → `/task-git` merge into `dashboard-improvements`), then proceed to N221.
