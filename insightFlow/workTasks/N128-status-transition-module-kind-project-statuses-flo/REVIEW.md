# N128 — status-transition module kind + Project.statuses — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

Adds the `status-transition` module kind (agent/sets/from) — locked by kind in
`isLockedModule` (custom: allowed, built-in-id rejected) — and
`ProjectSchema.statuses` (ordered id/title/color?/terminal?). The default flow
declares the canonical enum verbatim with `title === id`; empty falls back to
canonical. superRefine constrains edges/states to the flow's status universe and
enforces status-id uniqueness. The emitter/composer skip the new kind. Data only.

## Checklist verification

- [x] New kind validates; locked by kind — `flow-statuses.test.mjs`.
- [x] Default flow's statuses == canonical enum (ordered); terminal on merged/done.
- [x] Edges/states ⊆ the flow's set; empty ⇒ canonical fallback (back-compat); ids unique.
- [x] No engine change (emitter + composeAgent skip status-transition).

## Blockers

None.

## Non-blocking

- **`title === id` for the default statuses** is deliberate (badges render the raw status, so N130 stays byte-identical), but it leaves the canonical titles un-humanized. A follow-up could give nicer display titles once a deliberate UX change is acceptable.
- `readKind`'s lock-by-kind only bites once shipped status-transition built-ins exist; today it's forward-looking. Correct, just noting it's latent.

## Security & edge cases

- The locked-by-kind predicate is checked before the built-in-match branch, so a non-custom status-transition id reports "locked" rather than the generic message — good. Canonical color values are duplicated into default.json; they match `tokens.status` and are guarded for parity by the N130 tests.

## Notes

The pivot of Epic 4/5. Consumed by N129–N133.
