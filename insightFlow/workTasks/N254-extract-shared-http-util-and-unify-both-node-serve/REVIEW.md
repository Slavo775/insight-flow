# N254 — Extract shared http-util and unify both Node servers onto it — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-20
**PR:** (no PR yet — reviewed working tree)
**Verdict:** approved

## Summary

The largest and highest-risk change (two ~1900-line servers unified onto a shared `core/http-util.ts`, ~124 JSON-site conversions, SSE swap, security-relevant body cap). Both correctness and security review came back clean. The headline security fix (master POST body cap) is correct and confirmed live (300KB → 413). Server-side only; no client type errors here.

## Checklist verification

- [x] `core/http-util.ts` with `sendJson`/`readBody`(256KB→413)/`escHtml`/`serveStaticFile`/`MIME` + self-check — pass
- [x] dashboard server routes JSON + 7 body reads through it — pass
- [x] master server routes JSON/body/static through it — pass
- [x] master SSE → existing `SseTransport({path:"/events"})`; 8 `broadcast`→`emit`; `/api/hub/live` intact — pass
- [x] master POST routes enforce the cap (413) — pass (live-verified)
- [x] private copies removed; one shared `escHtml` — pass
- [x] `transport.ts` moved to `core/`; barrel + dashboard importer updated — pass

## Non-blocking

1. **`master/server.ts:919`** (update-check endpoint) still used bare `"application/json"` + raw `writeHead`/`end` instead of `sendJson`. **APPLIED during N255's fix cycle** (user authorized "fix all things") — now `sendJson(res, 200, { current, latest, updateAvailable })`. Typecheck/build/tests re-verified green.
2. **`http-util.ts` `readBody`** caps on `body.length` (UTF-16 code units), not bytes — a multi-byte UTF-8 body can reach ~768KB on the wire. Still firmly sub-MB / bounded; matches the pre-existing behavior it replaced. Consider a byte-based cap if strictness matters.
3. `req.destroy()` immediately after the 413 write can truncate the 413 body the client sees (cosmetic; carried over from the old `custom-defs.ts` pattern).
4. Dashboard `/log/events` dropped its stream-error `500` branch in the `readBody` swap (see N255 review — same pattern); only fires on a broken socket. Acceptable.

## Security & edge cases

Independent security review: **clean.** Body cap bounds memory correctly (idempotent `finish`, `done`-guarded data handler, `destroy`+resolve-null on overflow). Every static-serve caller keeps its own traversal guard before `serveStaticFile` (which intentionally does no confinement). SSE swap reproduces headers/retry/heartbeat/ACAO. No injection, authz, or secret-exposure issues; new barrel exports are stateless helpers.

## Notes

- Behavior-touching change (body cap + SSE transport swap) was verified live, not just by tests. Order matters at merge: N254 and N253 both touch the two servers — land N253 first (already approved).
- Related: [N253], [N255], [N256].


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-20
**Verdict:** approved

### Summary

Human verdict: "approved!"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Approved as part of the N253–N256 bundle (PR #168). No changes requested.
