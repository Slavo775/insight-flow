# N254 — Extract shared http-util and unify both Node servers onto it — Checklist

## Done criteria

- [x] `core/http-util.ts` exists with `sendJson`, `readBody` (256KB default cap → 413), `escHtml`, `serveStaticFile`, superset `MIME` + `MIME_JSON`/`MIME_HTML` + one assert self-check (`test/http-util.test.mjs`, 4 tests)
- [x] dashboard server routes all JSON responses (63 sites) + body reads (7) through it; local `MIME` removed
- [x] master server routes JSON (61 sites) / body / static through it; local `MIME_JSON`/`MIME_HTML`/`MASTER_ASSET_MIME` removed
- [x] master's hand-rolled SSE replaced by `SseTransport({ path: "/events" })`; 8 `broadcast()` → `transport.emit()`; `/api/hub/live` left intact
- [x] master POST routes enforce the cap (verified live: 300KB → 413)
- [x] private copies removed: `custom-defs.ts` `send()`/`JSON_MIME` (custom-defs `readBody` now delegates to shared), master inline SSE + duplicate MIME table
- [x] one shared `escHtml`; `dashboard.ts` `escHtml` + master `escapeHtmlAttr` removed
- [x] **bonus (self-containment):** `transport.ts` moved `dashboard/server/` → `core/` so master imports `../core/` not `../dashboard/` (barrel + dashboard importer updated)
- [x] per-endpoint body caps preserved (dashboard 16KB/16KB/64KB routes kept their limits via `readBody(req, res, N)`)

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] lint passes (eslint clean on all changed files; prettier applied)
- [x] `pnpm --dir packages/taskflow test` passes (373/373 — 369 prior + 4 new http-util)
- [x] No regressions in affected area

## Verification

- [x] Test suite exercises master SSE (proxy test), `/assets`, `/sounds`, dashboard 413 through the new shared paths
- [x] Live `/verify` (focused script) on master: oversized POST → 413 (NEW), invalid-JSON small POST → 400 (body still read), `/events` → text/event-stream + retry frame (SseTransport), missing `/assets` → 404
- [x] net line count of the two servers dropped materially (~hundreds of lines: index.ts + master both mostly deletions)
