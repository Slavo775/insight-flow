# N151 — dashboard server request error boundary + oversize-body 413

**Type:** fix
**Priority:** high
**Created:** 2026-06-18

## Problem

- The dashboard HTTP handler `createServer((req, res) => …)` (`packages/taskflow/src/dashboard/server/index.ts:507`) wraps individual endpoints in their own try/catch but has **no handler-wide error boundary**, and several async `req.on("end")` body callbacks (e.g. `/api/task-flow` reading `master.json` via `loadMaster`) can throw **unguarded** — which crashes the long-running dashboard process. This was hit in practice: `master.json` went transiently malformed during merges this session.
- Separately, `/api/task-flow`'s oversize-body path calls `req.destroy()` with **no response**, so a >16KB payload hangs the request (no `aborted` guard like custom-defs' `readBody`).

## Goal

1. An unhandled throw anywhere in the request handler (sync body or async `req.on("end")` callbacks) returns **HTTP 500** with a JSON error instead of crashing the process.
2. `/api/task-flow` (and any sibling that caps body size) responds **413** instead of `req.destroy()`-hanging on oversize input.
3. Happy-path behavior and existing per-endpoint error handling are unchanged.
4. A regression test proves a malformed `master.json` request yields 500 (or a handled error), not a crash.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — add a handler-wide boundary: wrap the synchronous body of the `createServer` callback (line 507) in try/catch → on throw, if headers not sent, `res.writeHead(500)` + JSON `{ error }`. Wrap the async `req.on("end", …)` callbacks (notably `/api/task-flow`, and any other body-reading endpoint that calls `loadMaster`/`getWorkDir`/`JSON.parse` outside a guard) so their throws also return 500. Prefer a small shared helper (e.g. `sendError(res, 500, msg)` + a `safeEnd(handler)` wrapper) over repeating try/catch.
- `/api/task-flow` oversize path — replace the bare `req.destroy()` with a `413` response (JSON `{ error: "payload too large" }`) and stop reading; mirror the `aborted`/response shape used by custom-defs' `readBody`.
- A test under `packages/taskflow/test/` (e.g. extend an existing server/endpoint test, or add one) that drives the handler with a malformed/missing `master.json` and asserts a 500 (handled), not an unhandled throw.

### Out of scope

- No new endpoints or behavior changes to happy paths.
- Do not add a process-level `process.on("uncaughtException")` backstop (deliberately excluded — the targeted handler boundary is the fix; a process-wide swallow could mask unrelated bugs).
- The SSE/transport path (`transport.handleRequest`) — leave as-is (it owns its own response).
- No change to the master/overview server beyond the shared pattern if trivially applicable.

## Implementation plan

1. **Shared error helper.** Add `sendError(res, status, message)` that writes `status` + `{ error: message }` JSON only if `!res.headersSent`.
2. **Handler-wide boundary.** Wrap the `createServer` callback body (from line 508) in try/catch; on catch call `sendError(res, 500, …)`. Ensure early `return`s for assets/SSE stay before the guarded region or are within it harmlessly.
3. **Guard async body callbacks.** For each `req.on("end", async/sync () => {…})` that reads disk/parses JSON (audit `/api/task-flow` first; check sibling POST/body endpoints), wrap the callback body in try/catch → `sendError(res, 500, …)`. Factor a `readBody`-style helper if the pattern repeats.
4. **Oversize → 413.** In the oversize branch, call `sendError(res, 413, "payload too large")` and `req.destroy()` after responding (or just stop consuming) — no silent hang.
5. **Test.** Add/extend a test that simulates a malformed `master.json` (or a throwing body handler) and asserts the response is 500, not an exception escaping the handler.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean; build OK.
- `pnpm --dir packages/taskflow test` passes incl. the new error-boundary test.
- Manual: with a deliberately corrupted `insightFlow/workTasks/master.json`, hit `/api/task-flow` (or the dashboard) — the server returns 500 and **stays up** (does not exit).

## Notes

- Source: N118 REVIEW.md non-blocking notes (#1 server error boundary, #2 oversize hang).
- Pairs with N152 (the CLI-side fail-open visibility); both are reliability hardening mined N99–N150.
- Keep the diff minimal and the helper local to the server module; match existing two-space + double-quote style.
