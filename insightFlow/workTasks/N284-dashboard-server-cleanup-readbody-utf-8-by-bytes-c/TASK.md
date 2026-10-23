# N284 — Dashboard server cleanup — readBody UTF-8 by bytes, consistent error codes, route table, dead routes

**Type:** rework
**Priority:** medium
**Created:** 2026-10-19

## Problem

`readBody` decodes each network chunk on its own. A multibyte character split across chunks becomes `U+FFFD`; the audit's probe turned "Ľubomír" into "��ubomír". So a large module prompt with Slovak diacritics can be saved corrupted. The size cap also counts UTF-16 units, not bytes.

The custom-defs handler reports any internal error (e.g. `EACCES`) as `400 "invalid JSON"`. Its revision check and write are not atomic across processes.

The dashboard's `dispatch` is a ~785-line if-chain:

- The same kind/id check and body-parse code are copied many times, with different status codes for the same error.
- GET routes answer any method.
- Unknown `/api/*` paths get the SPA HTML with a 200.
- `/api/activity` has no caller.
- `escHtml`'s doc says five characters but it escapes four.
- Custom include modules can never preview.

Source: `N271/AUDIT.md` **A62, A63, A64, A65** (dead route), **A78** (`escHtml`, include-doc).

## Goal

1. Request bodies are decoded once from bytes, and the size limit counts bytes.
2. Bad JSON is always `400`, handler failures are always `500` with the real cause logged, and unknown or wrong-method `/api/*` requests get JSON `404` / `405`.
3. Routing is a small table instead of an if-chain, with one JSON body helper.
4. Dead code is removed; `escHtml` escapes `'`; custom include previews work behind a path guard.

## Scope

### In scope

- `packages/taskflow/src/core/http-util.ts` — `readBody` (~:45-66), `escHtml` (~:72-79), a new `readJson` helper.
- `packages/taskflow/src/dashboard/server/custom-defs.ts` — body handling (~:179-192), revision check vs write (~:385-393, :437).
- `packages/taskflow/src/dashboard/server/index.ts` — `dispatch` structure (~:757-1542), `/api/activity` (~:941-944), `/api/include-doc` (~:1329-1353).
- Tests.

### Out of scope

- Trust gates → N272. Rebase on it; keep its gate at the top of the new router.
- Listen / watcher errors → N282.
- New endpoints or behaviour changes beyond status codes.

## Implementation plan

1. **`readBody` by bytes (A62).** Collect `Buffer` chunks, check the running `byteLength` against the limit, and decode once with `Buffer.concat(chunks).toString("utf8")`. Keep today's 413 behaviour (sent before `req.destroy()`; `log-events-endpoint.test.mjs:139`).
2. **`readJson` helper (A63, A64).** Wrap `readBody` + `JSON.parse`: bad JSON → `400 {error: "invalid JSON"}`; a handler throw → `500` with the message logged server-side (and the existing secret scrubbing applied), guarded by `headersSent`. Use it in every body route, replacing the ~7 copies.
3. **Route table (A64).** Replace the if-chain with an ordered `{ method, match, handler }` table (plain objects, no framework). Behaviour per route stays the same except:
   - an unmatched `/api/*` path → JSON `404`;
   - a matched path with the wrong method → JSON `405` with an `Allow` header;
   - non-`/api` paths still get the SPA shell.
   The N272 trust gate runs before the table. Move the copied kind/id validation into one helper.
4. **Custom-defs revision (A63).** Re-hash the target file right before the `rename` and return `409` if it changed since the check. Or document the single-user assumption in a code comment; `/task-analyze` picks one.
5. **Dead route (A65).** Delete `/api/activity` (grep first: only `e2e-smoke` uses it; update that test). Keep `/overview` (linked from `ui.tsx:78, 109`).
6. **`escHtml` (A78).** Add `.replace(/'/g, "&#39;")` and fix the doc comment.
7. **Custom include preview (A78).** In `/api/include-doc`, allow refs from user-space include modules only after `resolve(projectRoot, ref)` passes a project-root prefix guard and the N273 filename rule. Built-in refs keep their whitelist.
8. **Tests.**
   - A multibyte body split across chunks round-trips exactly.
   - A byte-size cap rejects a 3-byte-char body at the byte limit.
   - Bad JSON → 400 on every body route.
   - A handler EACCES (simulated) → 500.
   - Unknown `/api/x` → 404 JSON; `DELETE /api/work-tasks` → 405.
   - `escHtml("'")`.
   - Custom include preview works; `../` ref → 400.

## Verification

- `pnpm --dir packages/taskflow test` is green, including `custom-defs-api`, `http-util`, `log-events-endpoint`, `e2e-smoke` and the new tests.
- Manual: save a module whose prompt is ~150 KB of Slovak text with diacritics through the dashboard → reopening shows identical text (no `�`).
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6006/api/nope` → `404`.

## Notes

- Detail and evidence: `N271/AUDIT.md` A62–A65, A78. The seed's claim that `readBody` destroys the socket before 413 was **rejected**; don't change that order.
- **Depends on N272** (trust gate in `dispatch`). Coordinate with N282 (also edits `index.ts`, different regions).
- Recommended run: `/task-analyze N284` → `/task-implement N284`.
