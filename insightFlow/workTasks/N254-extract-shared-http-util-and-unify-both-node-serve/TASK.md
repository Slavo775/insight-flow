# N254 — Extract shared http-util and unify both Node servers onto it

**Type:** refactor
**Priority:** high
**Created:** 2026-07-18

## Problem

`packages/taskflow/src/dashboard/server/index.ts` (1939 lines) and `packages/taskflow/src/master/server.ts` (1751 lines) are twin god-files that independently hand-roll the **same** HTTP micro-framework. The audit (2026-07-18) counted, across the two files: **63 + 61** manual `writeHead + JSON.stringify + res.end` JSON responses, request-body reading reimplemented (dashboard inlines it **7×**, master has its own `readBody`), two copies of static `/assets` + `/sounds` + MIME serving, two HTML-escape helpers, and — critically — the master server re-implements SSE byte-for-byte while a reusable **`SseTransport` class already exists and is exported** from `transport.ts` / `src/index.ts` but master ignores it.

Two real consequences beyond duplication: (1) **master's `readBody` has no payload cap**, so its POST routes (`/api/register`, `/log`, `/api/projects/create`) read unbounded request bodies — dashboard's version aborts at 256KB with a 413; (2) two hand-rolled HTML-escape paths are the reason an escaping bug can surface in one server but not the other.

## Goal

1. One shared `http-util.ts` module: `sendJson(res, status, body)`, `readJsonBody(req, {limit})` (256KB cap → 413), SSE frame + headers helpers, the MIME table, and `escHtml`.
2. `dashboard/server/index.ts` routes every JSON response and body-read through it (removes the 63 + 7 sites).
3. `master/server.ts` routes through it too, and its hand-rolled SSE is replaced by the existing `SseTransport` class.
4. Master POST routes gain the 256KB body cap (behavior change — closes the unbounded-body hole).
5. Both servers verified live: SSE stream, capped POST, static assets/sounds all still work.

## Scope

### In scope

- **New:** `packages/taskflow/src/dashboard/server/http-util.ts` (or `src/core/` if it must be shared without a dashboard→master import edge — decide during implementation; see open question).
- **Consolidate into it:**
  - `sendJson` — replaces the 63 sites in `index.ts` + 61 in `master/server.ts` + the private `send()` in `custom-defs.ts:49`.
  - `readJsonBody` with 256KB cap — replaces `custom-defs.ts:165` `readBody`, `master/server.ts:353` `readBody`, and the 7 inline `req.on("data")` blocks in `index.ts`.
  - SSE: reuse `SseTransport` (`transport.ts`) in master, deleting master's inline `sseClients`/`broadcast`/`/events` frame+headers (`server.ts:822,827,978–999,1739–1749`). Keep master's separate `/api/hub/live` per-project liveness stream (genuinely different).
  - MIME table + secure static-file serve (`/assets`, `/sounds`) — one helper, replacing the two copies (`index.ts:100–110,847–867,1729` and `master/server.ts:180–190` + routes).
  - `escHtml` — one copy, replacing `dashboard.ts:40` `escHtml`, `master/server.ts:546` `escapeHtmlAttr`, `client/activity.ts:33` (client copy only if it can import from the shared module; otherwise leave client as N255's concern).

### Out of scope

- Introducing a real router / splitting the request handler into per-route files — tempting given the 870-line handlers, but that is a **separate** larger task; this one extracts shared helpers only, no route re-architecture.
- The client-side `activity.ts` escHtml→JSX conversion (that's N255).
- master's PWA-asset string constants and reverse-proxy split (note for a future task, don't do here).

## Implementation plan

1. **Write `http-util.ts`** — `sendJson`, `readJsonBody({limit=262144})` returning 413 on overflow, `sseHeaders()` + `sseFrame()` (or confirm `SseTransport` already covers both servers' needs), `MIME` map, `serveStaticFile(dir, urlPath, res)` with `..`-confinement, `escHtml`. One runnable self-check (assert) for `readJsonBody` cap + `escHtml`.
2. **Migrate dashboard server** — replace the 63 JSON sites and 7 body-reads; route `/assets` + `/sounds` through the shared static serve; use shared `escHtml`.
3. **Migrate master server** — same JSON/body/static swaps; **replace hand-rolled SSE with `SseTransport`**; keep `/api/hub/live` as-is.
4. **Apply the 256KB cap to master POSTs** — this is the deliberate behavior change; confirm each master POST path returns 413 on oversized body.
5. **Delete the now-dead private copies** — `custom-defs.ts` `send()`/`readBody`, master inline SSE + MIME table.
6. **Rebuild + gates + live verify** — build, `tsc --noEmit`, lint, test, then `insight-flow ui` and exercise both servers (SSE reconnect, a capped POST, an asset + a sound fetch).

## Verification

- `pnpm --dir packages/taskflow test` + `tsc --noEmit` + lint green.
- `insight-flow ui`: dashboard live updates stream (SSE), master `/events` streams, `/api/hub/live` still works.
- `curl` an oversized POST to a master route → **413** (was previously accepted). Normal POST → works.
- `/assets/*` and `/sounds/*.mp3` serve on both servers; `..` traversal still rejected.
- Net line count of the two servers drops materially (audit estimate: hundreds of lines).

## Notes

- Do **after** N253 (smaller surface). Source: ponytail audit 2026-07-18. See ANALYSIS.md.
- Use `/verify` — this is behavior-touching (body cap + SSE transport swap), not a pure move. Related: [N253], [N255].
