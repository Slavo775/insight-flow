# N91 — Unify near-duplicate role wording onto shared modules — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-11
**PR:** https://github.com/Slavo775/insight-flow/pull/67
**Verdict:** approved

## Summary

Wording unification (PR #67, commit `45489d1` post-rebase): the three shared discipline modules gain real referents — `minimal-diff` ×3 (implement, review-fix, incident), `scope-guard` ×2 (implement, review-fix), `recorder-discipline` ×2 (human-review, request-changes) — with role nuance retained as role-scoped bullets. **This is the first round where shipped prompt text deliberately changes**; the whole behavior delta is the 5-file role-MD diff (~16 ins / 11 del), reviewed line-by-line below. One disclosed spec deviation: a 3-line renderer separator fix (heading-only section opens with a blank line) — necessary for the design, covered by two new synthetic tests, and byte-verified against all 9 roles via the idempotent compose-apply. Gates green (build, 102/102, lint at baseline, drift suite, templates synced). Verdict: **approved**.

## Checklist verification

- [x] Adoption inventory documented — pass (PR #67 body, decision table incl. not-adopted cases)
- [x] Three shared modules ≥2 referents — pass (3/2/2; enforced by a new test)
- [x] Role qualifiers preserved — pass (implementer "Out of scope", fixer "only fix flagged blockers", incident verify/scope bullets, request-changes specificity bullet)
- [x] Regenerated MD committed with JSON; diff is unification-only — pass (verified hunk-by-hunk; semantic audit below)
- [~] No schema / renderer / CLI changes — **deviation, accepted**: 3-line `compose.ts` separator rule + defensive `?.`; schema and CLI untouched. Without it, heading-only sections rendered off house style. Disclosed in commit, PR, and here.
- [x] Templates re-synced — pass (5 copied, 7 unchanged)
- [x] Gates: build ✅ · 102/102 ✅ · lint = baseline ✅ · drift suite green
- [x] compose-apply idempotent — pass (all 9 `unchanged` re-verified during review, post-rebase)

## Blockers

None — approved.

## Non-blocking

1. **Semantic audit of the prompt delta — one real tightening to consciously ack:** the implementer's SCOPE GUARD loses the ">2 files" grace threshold in favor of the stricter shared "any file outside declared scope → stop and ask". It aligns with `AGENT_PROTOCOL`'s universal never, but it does make the implementer ask more often. Everything else audited as equivalence-or-mild-broadening: fixer "review findings" → "task at hand" (review specificity retained by its scope-guard bullet); incident keeps verify/scope bullets, gains the refactor bullet it previously abbreviated; recorder roles get "requests" added to "feedback…verdicts" and "decide" added to "approve" — all consistent with role intent.
2. **Stale doc-comments in `compose.ts`**: the header (…"joins it without a blank line") and the `composeAgent` JSDoc ("a body-only section block after a section joins with \n") don't mention the new heading-only → blank-line case. Two-line doc fix when next touched.
3. `recorder-discipline`'s "Never approve or decide on the human's behalf" is review-flavored for `task-request-changes` — benign, but if it ever reads wrong, the module can split (it has only 2 adopters).

## Security & edge cases

- No new I/O surface — module JSON + renderer separator only; `--apply` path unchanged from N90's hardened version.
- The defensive `?.` covers raw (un-parsed) registries passed directly to `composeAgent` — previously a TypeError; production path (Zod-parsed, defaults applied) unaffected.

## Notes

- Rebase housekeeping verified during this review: stack rebased onto main post-#65 (`chore/N91-N92-specs` → `rework/N91-unify-role-wording`), force-pushed with lease, PR #67 retargeted onto the specs branch so its diff is exactly the N91 change set. Merge order: **#66 → #67** (GitHub auto-retargets #67 to main when #66 merges).
- Reviewer caveat: implemented and reviewed in the same session; human review on PR #67 is the independent gate — especially for Non-blocking #1.
- Next on the line: N92 (Round 4 — heterogeneous modules).


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** approved

### Summary

Human accepted N91 and merged the PRs (#67 into the spec branch, then #66 into main); task closed to `done`. Human's exact comment:

> please its accepted and done pr is merged we can continue wiht next task

### Checklist verification

- AI round accepted as-is, including the implementer scope-guard tightening flagged in AI Non-blocking #1 and the disclosed renderer deviation.

### Blockers

None — approved.

### Non-blocking

None this round.

### Security & edge cases

None this round.

### Notes

- AI Non-blocking #2 (stale `compose.ts` doc-comments) and #3 (recorder wording for request-changes) remain open as minor follow-ups for N92.
- Next: N92 (Round 4 — heterogeneous modules).
