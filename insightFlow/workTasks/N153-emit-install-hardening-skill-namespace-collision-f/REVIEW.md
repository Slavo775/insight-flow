# N153 — emit/install hardening — skill-namespace collision, frontmatter escaping, empty-prompt, ARGUMENTS parity — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

All four emit/compose fixes landed cleanly with tests. Risk: low; isolated to the emit/compose layer; drift guard byte-identical.

## Checklist verification

- [x] Cross-namespace collision via `claimKey` + `collectOtherClaims` (command-as-skill vs skill-module in `.claude/skills`) — pass (test asserts the throw)
- [x] Frontmatter `description` JSON-stringified (YAML-safe) — pass (test with `:`/`#`/`[]`); aligns with the cursor provider's existing quoting
- [x] Empty composed prompt → skipped + warn — pass (test)
- [x] `$ARGUMENTS` appended to force-emit body — pass (test asserts endsWith)

## Non-blocking

1. The empty-prompt + collision warnings go to `console.error`; consistent with the codebase's CLI-warning style. Fine.

## Security & edge cases

- `collectOtherClaims` preserves the original same-kind collision semantics (command-vs-command, skill-vs-skill) while adding the cross-namespace case — verified by tracing `claimKey`.
- JSON.stringify on description handles quotes/newlines/colons safely.

## Notes

Sources N138 + N149. Clean, well-tested. No regressions (254 tests).


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
