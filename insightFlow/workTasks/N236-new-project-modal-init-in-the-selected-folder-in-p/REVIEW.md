# N236 — New-project modal — init in the selected folder (in-place), respecting existing .claude/ and CLAUDE.md — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-14
**PR:** (no PR yet)
**Verdict:** approved (1 blocker found + fixed in this pass; re-verified)

## Summary

Reviewed the N236 in-place-init diff with correctness + security subagents and a
ponytail (over-engineering) pass. One real **runtime blocker** was found — the new
`location` state var shadowed `window.location` in `location.reload()` — and fixed
in this pass. Security is clean (confinement preserved). The diff is lean. After the
fixes: tsc clean, lint 0 errors, build green, 13/13 init tests, live endpoint checks
pass. Approved.

## Checklist verification

- [x] Init-location radio (in-folder default / subfolder) — pass.
- [x] Server dir resolution + confinement (in-place `dir=realParent`, realpath-confined) — pass (security-confirmed).
- [x] 409 "already initialized" message — pass.
- [x] Non-destructive `.claude/` + `CLAUDE.md` — pass (2 unit tests).
- [x] `conflicts` surfaced (claude commands) — pass; known scope limit (see Non-blocking #3).
- [x] N233 gitignore in-place (own footprint only, not `.claude/`) — pass.
- [x] Gates: tsc, lint (0 err), build, tests — pass.

## Blockers

1. **`location.reload()` shadowed by the new `location` state var** —
   `NewProjectModal.tsx:398,402`. The added `const [location, setLocation]`
   made `location` inside `create()` the string state, so `location.reload()` was a
   runtime `TypeError` on every successful create (the overview never refreshed).
   tsc did not catch it (resolved `location` to the ambient global type) — only a
   runtime bug, which the server-only live test had missed. **Fixed:** changed both
   calls to `window.location.reload()`. Re-verified: tsc/build green.

## Non-blocking

1. **Dotted folder name rejected** (`NewProjectModal.tsx`) — an in-folder default
   from a folder like `my.app` would fail the server's `[A-Za-z0-9 _-]` name check.
   **Fixed:** added `labelFrom()` which sanitizes the derived default (`my.app` →
   `my-app`); used for the submit fallback + placeholder.
2. **Duplicate `.taskflow-activity.jsonl` in `.gitignore`** on in-place —
   `initProject` already ignores it, so the anchored rule was redundant. **Fixed:**
   dropped it from the in-place rules (`server.ts`).
3. **Conflict reporting covers `.claude/commands` only** — files written by
   `installFlow` (composer-authoring: `.claude/commands/*` + `.claude/agents/*`) skip
   silently on same-name and aren't in `conflicts`. Known scope limit (ponytail:
   commands are the realistic collision surface; init is non-destructive regardless).
   **Deferred follow-up**, not blocking.

## Security & edge cases

- **Clean — no regression.** In-place `dir = realParent` is realpath-confined to
  `browseRoot()`; skipping the `parentPrefix` check for in-place is safe (it only
  guarded the subfolder concatenation). `location` is a literal-union branch selector
  (no injection); gitignore rules are fixed literals; the N233 symlink guard on the
  ignore file still applies. (Confirmed by review-security.)
- **LOW, pre-existing (follow-up):** `initProject`'s other writes (`taskflow.config.json`,
  `.gitignore`, hooks) use plain `writeFileSync` with no lstat guard. In-place now
  targets existing folders, so a pre-planted dangling symlink at one of those paths
  would be followed. Bounded (needs local write access to a browse-root folder +
  trusted caller); not introduced by N236. Extend the N233 lstat guard to those
  writes as a follow-up.

## Notes

- Ponytail pass: diff is lean (net ~0 lines to cut); the only scope note is
  Non-blocking #3, which correctness independently confirmed.
- Two deferred follow-ups: (a) extend conflict reporting to installFlow files;
  (b) extend the lstat symlink guard to `initProject`'s writes.
- Blocker + both non-blocking items were fixed during this review pass and
  re-verified; no outstanding blockers.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-14
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

- Human wording (verbatim): "approved".
