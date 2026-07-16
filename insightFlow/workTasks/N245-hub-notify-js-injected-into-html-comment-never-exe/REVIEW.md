# N245 — hub-notify.js injected into HTML comment, never executes — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-16
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Small, correct fix (2 files, +13/−5). Replaces two `html.replace("</body>", …)`
calls — which match the *first* `</body>`, one of which lived inside the shell's
own comment, burying the notify script so it never executed — with a
`injectBeforeBodyClose()` helper that targets the *last* `</body>` via
`lastIndexOf`. Also rewords the misleading comment so it no longer holds a literal
`</body>`. Low risk: pure string slicing, static snippet, no user input.

## Checklist verification

- [x] Overview page: `/hub-notify.js` executes — tag lands after the comment,
  before the real `</body>` (verified against built `dist/master/index.html`).
- [x] Proxied project pages (`/p/<id>/*`): same helper, append-on-absent
  behavior preserved from the old ternary.
- [x] A stray `</body>` in content/comment can no longer hijack the injection
  (`lastIndexOf` = the true closing tag).

## Blockers

None.

## Non-blocking

1. `lastIndexOf("</body>")` is case-sensitive. All shells here emit lowercase
   `</body>`, so this is correct today; only worth revisiting if a proxied page
   ever emits `</BODY>` (none do).

## Security & edge cases

- No user/proxy-controlled data flows into the injected snippet (`hubLink` +
  `notifyTag` are static literals). No new XSS surface. Trust gates unchanged.
- Edge cases covered: no `</body>` → append; `</body>` in a comment → skipped in
  favor of the real one; idempotence guard at site 1 retained.

## Notes

- Reviewed directly (13-line pure-string-slice diff) rather than fanning out
  correctness/security subagents — proportionate to scope.
- 2.8.2 patch on `main`. Renumbered from N242 → N245 to avoid an ID collision
  with the log-engine tasks (N242–N244, PR #159, not yet merged).


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-16
**Verdict:** approved

### Notes

> approved!
