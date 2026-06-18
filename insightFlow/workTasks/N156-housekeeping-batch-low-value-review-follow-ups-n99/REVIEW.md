# N156 — housekeeping batch — low-value review follow-ups (N99-N150) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Honest triage batch: the one worthwhile item done, the rest correctly identified as moot/already-done/cosmetic and skipped with reasons. Risk: minimal.

## Checklist verification

- [x] #1 DRY: `LOCKED_MODULE_IDS` extracted to shared `core/locked.ts`; server (`user-registry`) + client (`locked.ts`) re-export it — pass (both typechecks green)
- [x] #3 builtins-memo → **moot** (N150 removed the plumbing) — correctly skipped
- [x] #6 response-key doc → **already present** (comment at `custom-defs.ts:266`) — correctly skipped
- [x] #2 append-position / #4 bundle-picker dots / #5 hex-note → cosmetic + non-trivial, skipped with note — acceptable per the batch's allowance
- [x] Out-of-scope design items untouched — pass

## Non-blocking

1. The `export { X } from "..."; import { X } from "..."` dual in both consumers is valid but slightly unusual; a single `import` + `export` line reads cleaner. Cosmetic.
2. The deferred cosmetic items (#2/#4/#5) remain available if a future polish pass wants them.

## Security & edge cases

- The shared `core/locked.ts` is zod/fs-free, so the client bundle stays clean (the whole point of the original duplication). Verified.

## Notes

Good restraint — no invented busywork. The DRY removes a real drift risk between server and client lock sets.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the review-follow-ups round (N151–N156) and authorized commit + push + PR + merge via gh.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "please done commit push create PR and merge it via gh"
