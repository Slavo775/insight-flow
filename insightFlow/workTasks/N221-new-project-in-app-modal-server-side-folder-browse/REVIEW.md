# N221 — New Project in-app modal + server-side folder browser — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**PR:** (no PR yet — branch `feat/N221-new-project-modal-folder-browser`)
**Verdict:** fix-needed

## Summary

The modal, folder browser, and confinement logic are well-built: path-traversal confinement (`realDirWithinRoot`), slug safety, the loopback gate, and the proactively-added cross-site gate are all **sound** where they apply. But the two new filesystem endpoints (`GET /api/fs/list`, `POST /api/projects/create`) are reachable **cross-origin via DNS rebinding** — a remote website can enumerate the user's home directory and create files under the browse root, because the server binds all interfaces, sets `Access-Control-Allow-Origin: *`, and never validates the `Host` header. REQUEST CHANGES for that (HIGH); the rest are small correctness/UX items. Risk: high (remote filesystem read + write on a published, all-interfaces server).

## Checklist verification

- [x] `GET /api/fs/list` lists sub-dirs, loopback-only, confined to `browseRoot()` — pass (live + test)
- [x] Path escape (`../`, symlink) → 400 — pass (`realDirWithinRoot` resolves the full realpath; verified sound)
- [x] `POST /api/projects/create` accepts `{name, dir}`, creates `<dir>/<slug>` inside root — pass (test scaffolds a real project)
- [x] `dir` outside root → 400; existing → 409 — pass
- [x] Modal replaces `prompt()`/`alert()`; inline status; dark theme — pass (live: no `prompt`)
- [x] typecheck / eslint / tests (344, +2) — pass
- [~] Cross-site guard — present, but **insufficient** on its own (Blocker 1)

## Blockers

1. **HIGH — DNS-rebinding (+ fail-open Fetch-Metadata) lets a remote site read the home dir and create files.**
   `server.ts` — `GET /api/fs/list` (~679), `POST /api/projects/create` (~723), `isCrossSiteRequest` (198–201); root cause: `url` built from a hardcoded `http://localhost:${config.port}` (450) so the **`Host` header is never validated**, and `ACAO:*` is global (440).
   **Why:** the endpoints defend with only (a) loopback `req.socket.remoteAddress` and (b) `Sec-Fetch-Site`. Both fall to DNS rebinding: an attacker page at `http://evil.com:6100` rebinds `evil.com` → `127.0.0.1`; the victim's browser fetches `http://evil.com:6100/api/fs/list` → the socket is loopback (gate (a) passes), the fetch is same-origin to the page (gate (b) sends `Sec-Fetch-Site: same-origin`, passes), and `ACAO:*` lets the attacker's JS read the JSON → full home-dir enumeration, and `POST create` → `mkdirSync` + `initProject` anywhere under `browseRoot()`. Separately, `Sec-Fetch-Site` **fails open when absent** (older browsers / some contexts): a cross-origin simple GET can read the listing (ACAO:*), and a cross-origin `text/plain` POST (no preflight, body parsed by `JSON.parse` with no Content-Type check) can create — no rebinding needed.
   **Fix:** add a shared guard for these local-only endpoints that (i) **validates the `Host` header** host is loopback (`localhost`/`127.0.0.1`/`[::1]`, optionally the expected port) — this is the standard anti-rebinding defense (in rebinding, `Host` = `evil.com`, so it's rejected); (ii) treats a request as untrusted when it carries a cross-origin `Origin` **or** a non-`same-origin`/`none` `Sec-Fetch-Site` (don't fail open — if `Origin` is present it must be loopback). Apply the same guard to `POST /api/hub/projects/:id/start` (N215 — same class: it spawns a process and is equally rebinding-exposed). Consider also not emitting `ACAO:*` on these sensitive routes.

## Non-blocking

1. **Stale `npDir` on a failed re-open → Create targets the wrong folder.** `overview.ts` `createProject` (~199) resets name+status but not `npDir` / `#np-path` / `#np-list`; if the reopening `npBrowse(null)` fails, `npDir` keeps the previously-browsed folder and Create scaffolds there. Fix: reset `npDir = null` (and clear the path/list) at the top of `createProject`.
2. **Double-POST on the success window.** `npCreate` (~249) re-enables the button on success before the 900 ms reload; a second click re-POSTs → 409 flips the green status to red. Fix: leave the button disabled on success (only re-enable on error).
3. **Symlinked sub-directories are undiscoverable.** `server.ts` fs/list filter uses `d.isDirectory()` (~268), which is false for a symlink-to-dir, so symlinked project folders (common on dev machines) can't be browsed. Fix: also accept `d.isSymbolicLink()` + `statSync(...).isDirectory()`.
4. **Error/path disclosure (low):** the fs/list 500 echoes raw `err.message` (absolute path), and the 200 returns `root`/`dir` absolute paths (incl. OS username). Fine for this local tool, but a generic 500 string would be tidier.
5. **Filesystem-root edges (very low):** `trimSlash('/')+'/'+name` → `//name`, and `dir.startsWith(realParent + sep)` is false when `realParent === '/'`. Only bites if `INSIGHT_FLOW_BROWSE_ROOT=/`. Add a one-line guard if `/` should be supported.

## Security & edge cases

Verified **sound** (do not re-flag): symlink escape via `dir` (realpath resolves the whole path), `startsWith(realRoot + sep)` sibling-prefix bypass, slug traversal (regex forbids `.`/`/`, `.trim()` + `!name`), non-existent dir → 400, loopback allowlist unchanged, no `initProject`/shell injection via `name`/`dir`. TOCTOU between `realpathSync` and `readdir`/`mkdir` exists but needs a local writer in the window (low).

## Notes

- The cross-site guard added during implementation was a good instinct but Fetch-Metadata alone is insufficient for a home-dir-reading endpoint — Host validation is the load-bearing fix.
- Blocker 1's fix is a small shared helper; applying it to `/start` closes the same hole there (flagged as a follow-up at implementation time).
- Next: `/task-review-fix` for Blocker 1 (+ the small non-blocking items), then re-review.

---

## Fixes applied (task-review-fix, 2026-07-12) — "Fix all issues"

**Blocker 1 — DNS rebinding + fail-open Fetch-Metadata → FIXED** (`server.ts`).
- Replaced the Fetch-Metadata-only `isCrossSiteRequest` with **`isTrustedLocalRequest(req)`**, which requires: (i) the `Host` header host is loopback (defeats DNS rebinding — a rebound request carries the attacker's hostname), (ii) no cross-origin `Origin` (loopback host required if present), and (iii) `Sec-Fetch-Site`, if present, is `same-origin`/`none`. Applied to `/api/fs/list`, `/api/projects/create`, **and** `/api/hub/projects/:id/start` (same rebinding class).
- Tests: `Host: evil.example` → 403, `Origin: http://evil.example` → 403, loopback `Host` → 200 (plus the existing `Sec-Fetch-Site: cross-site` → 403).

**Non-blocking → all FIXED.**
1. `createProject` now resets `npDir = null` + clears `#np-path`/`#np-list` before browsing, so a failed re-open can't leave a stale target.
2. `npCreate` keeps the button disabled on success (only re-enables on error) — no double-POST → green→409-red flip.
3. `fs/list` now includes symlinks that resolve to directories (`isSymbolicLink()` + `statSync`), so symlinked project folders are browsable.
4. `fs/list` errors are now generic ("Could not read folder") — no raw path in the 500.
5. Filesystem-root edges: `npBrowse` builds `'' + '/' + name` when `d.dir === '/'`; create's confinement uses a normalized parent prefix (handles `INSIGHT_FLOW_BROWSE_ROOT=/`).

**Gates:** typecheck clean, eslint clean, `npm test` → **344** (N221 test extended with the Host/Origin/rebinding assertions). Verified sound items from Round 1 unchanged.

**Verdict after fixes:** ready for re-review.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

The HIGH blocker fix (`isTrustedLocalRequest`) was **independently adversarially verified and holds** against the browser threat model. All 5 non-blocking items are fixed. The verification also surfaced **two adjacent pre-existing CSRF/disclosure holes of the same class** — I closed those too (same trivial guard). Clean. APPROVE.

### Checklist verification

- [x] **Blocker (DNS rebinding + fail-open) resolved & verified sound.** DNS rebinding blocked (`Host` is a browser-forbidden header — JS can't set it; a rebound request carries the attacker's hostname → refused); cross-origin POSTs *always* carry `Origin` per the Fetch spec → create/start fully protected; no `headerHost` parse bypass (`evil@localhost`, `localhost.evil.com`, trailing-dot, IPv6 all fail closed); legit hub page (loopback Host + same-origin Origin + `same-origin` SFS) passes. Applied to `fs/list`, `create`, `start`.
- [x] Non-blocking 1–5 all fixed (stale `npDir`, double-POST, symlinked dirs, generic errors, root-`/` edges).
- [x] typecheck / eslint / tests → **345** (guard + Host/Origin/rebinding + register/list/refresh CSRF assertions).

### Blockers

None.

### Non-blocking (residuals — all acceptable)

1. **Safari `no-cors` GET fail-open on `/api/fs/list`:** Safari sends neither `Origin` nor `Sec-Fetch-Site`, so a cross-origin `no-cors` GET with `Host: localhost` passes the guard — but it's a `no-cors` request, so the response is **opaque** (attacker JS can't read the listing) and a GET has no side effect. Not exploitable; noted.
2. **Custom loopback alias:** a user reaching the hub via an `/etc/hosts` alias not in `{localhost,127.0.0.1,::1}` (e.g. `myhub.local`) would get 403 on the control-plane endpoints. Inherent trade-off of Host-allowlist anti-rebinding; `localhost`/`127.0.0.1` work.
3. **Non-browser local clients** (curl, other loopback processes) can forge headers and pass the guard — expected; `remoteAddress` loopback is the boundary for non-browser callers.
4. **Symlink-to-outside-root** now appears in `fs/list` but is un-enterable (browse → 400, confinement holds) — a cosmetic dead entry; fine.

### Security & edge cases

- Independent verification: guard **sound** for `fs/list`/`create`/`start`.
- **Adjacent holes closed (same class, pre-existing — folded in):** `POST /api/register` (was `remoteAddress`-only → a website could poison a registry `url`/`path` keyed on caller-supplied `projectId`; a planted `path` is the `cwd` on a later Start) and `GET /api/hub/projects` + `POST /api/hub/refresh` (were ungated + `ACAO:*` → any site could read project names/activity state or trigger the probe sweep). All three now require `isTrustedLocalRequest`; server-to-server registration (Node fetch, no browser headers) still passes. Test added.

### Notes

- These three extras are strictly pre-existing (N214) and outside N221's feature, but they're the exact CSRF class the blocker fix is about, cheap to close, and the user asked to fix all issues — so they're folded into N221's security hardening rather than deferred.
- Next (gated): human review, then `/task-git`.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-12
**Verdict:** approved

### Notes

> approved land it on dashboard-improvements

Approved. Land N221 on `dashboard-improvements` (human-review → `/task-git` merge).

### Notes
