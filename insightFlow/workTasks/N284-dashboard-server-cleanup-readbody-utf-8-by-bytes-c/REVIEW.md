# N284 — Dashboard server cleanup — readBody UTF-8 by bytes, consistent error codes, route table, dead routes — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `7844140` on `chore/N271-audit-fixes`)
**Verdict:** APPROVED

## Summary

`readBody` now buffers raw chunks, caps by bytes and decodes once (fixes the split-multibyte corruption); the custom-defs body reader separates a JSON parse error (400) from a handler failure (500); an unmatched `/api/*` returns a JSON 404 instead of the SPA shell; the dead `/api/activity` route is gone; `escHtml` escapes `'`. The implementer deliberately deferred the full route-table rewrite (A64), the cross-process revision re-check (A63) and the custom include-doc preview (A78) and documented why. Risk: low — small, well-bounded server changes; no correctness or security defect found. Four small follow-ups are worth doing before merge but do not block.

## Checklist verification

- [x] `readBody` collects Buffers, limits by bytes, decodes once; 413 behaviour unchanged (A62) — pass (`core/http-util.ts:54-74`; the 413-before-destroy order is still proven by `log-events-endpoint.test.mjs:139-151`). See non-blocking #2: the new byte-cap unit test is not discriminating.
- [x] custom-defs reader splits 400 parse / 500 handler, `headersSent`-guarded (A63) — pass with gaps (`custom-defs.ts:186-204`); the spec's "logged server-side" is missing (#3) and no test covers the split (#4)
- [ ] Route-table rewrite + per-route 405 (A64) — DEFERRED, justified: the targeted `/api/*` JSON 404 is in (`index.ts:1656`) and sits after every real `/api` route; wrong-method handling is harmless under the N272 gate (non-GET already requires same-origin)
- [ ] Kind/id validation helper (A64) — DEFERRED, justified (bound to the table rewrite)
- [ ] Revision re-check / single-user assumption documented (A63) — PARTIAL: the assumption is written in CHECKLIST.md but the spec asked for a code comment at the check; none was added (#1)
- [x] `/api/activity` deleted, e2e-smoke updated, `/overview` kept (A65) — pass (`index.ts:1060-1062`; e2e-smoke asserts 404 + JSON; `/overview` at `:983`)
- [x] `escHtml` escapes `'`; doc correct (A78) — pass (`http-util.ts:78-86` + test)
- [ ] Custom include preview behind a project-root guard (A78) — DEFERRED, justified: current behaviour is the safe one (custom refs 404); enhancement only
- [x] Quality gates: typecheck / lint / full suite 418/418 — pass (as run by the implementer; not re-run in this read-only review)

## Blockers

None.

## Non-blocking

1. `custom-defs.ts:397-407` — add the code comment the spec asked for above the revision check, e.g. `// N284 (A63) — check-then-write is not atomic across processes (MCP vs dashboard); accepted for a single-user local tool. In-process is safe: POST is O_EXCL, PUT is tmp+rename.`
2. `test/http-util.test.mjs:81-94` — the "caps by BYTES, not UTF-16 units" test does not prove its claim: "Ľubomír" is 7 chars / **9** bytes (the comment says 8), and with `limit = 4` the OLD char-cap (7 > 4) also 413'd, so the test passes on both implementations. Fix: use `limit = 8` (7 chars would pass the old cap, 9 bytes fail the new one), or `readBody(req, res, 2)` with `Buffer.from("€")` (1 char, 3 bytes); correct the comment to 9 bytes.
3. `custom-defs.ts:197-203` — the 500 path returns to the client but logs nothing; spec step 2 said "logged server-side". Add `console.error("[custom-defs] handler failed:", err)` before the `headersSent` guard. No `scrubSecrets` needed here: this route carries definitions, never `${VAR}` secret inputs, and `err.message` is an fs/transport message (an EACCES path, consistent with the pre-existing 500s on this gated local server).
4. No test covers the A63 split (spec listed "handler EACCES (simulated) → 500"). Cheap check: invoke the handler with an EventEmitter request that emits a valid POST body and an `onJson` that throws, assert 500 not 400 (same mock style as `http-util.test.mjs`).
5. `custom-defs.ts:548-549` — `onChanged?.()` runs before `sendJson`; if `transport.emit` ever throws, the file is already written and the client now gets a 500 (previously a misleading 400). Hardening: respond first, then notify, or wrap `onChanged` in its own try.
6. Behaviour note for the CHANGELOG: the body cap is now stricter for non-ASCII payloads (it finally matches the doc at `http-util.ts:40`): `/log/events` (64 KB) with ~60K chars of Slovak text now 413s; a ~150 KB Slovak module prompt (~165 KB bytes) still fits under 256 KB. `escHtml` is in the public barrel (`src/index.ts:149`), so `'` → `&#39;` is a public output change.
7. Nits: `e2e-smoke.test.mjs:102` test title still names `/api/activity`; exactly `/api` (no slash) and `//api/x` still get the SPA shell — harmless.

## Security & edge cases

- Byte cap is strict: `size` is checked before `chunks.push` (`http-util.ts:64-71`), so an oversize chunk — even a single one — is never stored; nothing buffers beyond `limit`; `req.destroy()` tears down the socket; the `done` flag makes late `data`/`end` no-ops (`:58-63`).
- Every `escHtml` sink is a double-quoted attribute or text content (`master/server.ts:580`, `index.ts:1008`, `dashboard.ts:48-255`); the one adjacent JS sink uses `JSON.stringify` separately — `&#39;` is safe everywhere.
- The JSON 404 is placed after the N272 gate (`index.ts:849` Host → 421, `:854-862` non-GET → 403): a foreign-Host request to an unknown `/api` path gets 421, never 404; the 404 body is fixed and does not echo the path.
- No handler relied on throwing to signal bad input (`writeDefinition` uses `safeParse` → `DefResult`; `atomicWrite` errors are already caught), so the 400→500 change does not alter API semantics; the only real throw sources are `definitionRevision`'s `readFileSync` and `onChanged`.
- `/api/activity` data now reaches the browser only via the SSE snapshot (`index.ts:1727`), which is behind the N272 gate; the master's own `/api/activity/:projectId` is a distinct, token-fed registry read — no cross-reference, nothing newly exposed.

## Notes

- The implementer made the scope cut (route-table rewrite) themself rather than via the `/task-analyze` run the spec recommended; the reasoning is sound (cleanliness, not correctness, against 418 green tests) and is documented in CHECKLIST.md.
- Follow-ups #1–#4 are small and worth folding in before merge; #5–#7 can ride in a later cleanup. None change the verdict.

## Follow-up log (task-review-fix sweep, 2026-10-20, Opus 4.8)

Verdict was APPROVED; these are the non-blocking follow-ups, applied since the user asked for all blocking + non-blocking items.

- #1 added the revision-check code comment (check-then-write is not atomic across processes; accepted for a single-user local tool; in-process POST=O_EXCL / PUT=tmp+rename).
- #2 the byte-cap `readBody` test is now discriminating: `readBody(req,res,8)` with "Ľubomír" (7 chars / **9** bytes) — the old char-cap (7 ≤ 8) would have passed, the byte-cap (9 > 8) 413s. Comment corrected to 9 bytes.
- #3 the custom-defs 500 path now `console.error`s the handler failure (definitions carry no `${VAR}` secrets, so the fs/transport message is safe to log on this gated local server).
- #4 added `N284 (A63): invalid JSON → 400; a handler write failure → 500` — a real e2e test that forces an EACCES (read-only user-space dir) and asserts 500 (not the old conflated 400). Skips the 500 assertion only if perms don't block the write (root).
- #5 `onChanged` (SSE notify) is now wrapped so a notify throw can't turn a successful write/delete into a 500.
- #7 fixed the stale e2e-smoke test title that still named `/api/activity`.

**Left (release-flow owns it):**
- #6 the CHANGELOG behaviour note (stricter non-ASCII body cap; `escHtml` now escapes `'` in the public barrel) — release-please generates the CHANGELOG from commit messages at release time; the commit records the behaviour.

Verified: typecheck + lint + build clean; http-util + e2e-smoke + custom-defs-api suites green.
