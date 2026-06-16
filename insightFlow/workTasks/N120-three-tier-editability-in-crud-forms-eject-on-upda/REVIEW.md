# N120 — Three-tier editability in CRUD + forms — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

custom-defs CRUD enforces CUSTOM / DEFAULT / LOCKED tiers: PUT to a built-in id
ejects (override file), DELETE of a built-in reverts the override (or 403 if
nothing to revert), locked ids 403 on any mutation, custom unchanged. Forms gate
read-only for locked, "Edit (eject)" + "Revert to shipped" for defaults. The
`fileFor` slug fix (only strip `custom:`) is correct and was the right catch.

## Checklist verification

- [x] PUT built-in id → eject; locked → 403; custom unchanged — `custom-defs-api.test.mjs`.
- [x] DELETE built-in → revert override (404/403 when none); custom delete checks references.
- [x] Forms: locked read-only, default Edit-ejects + Revert, custom full CRUD.

## Blockers

None.

## Non-blocking

- The status response keys differ by path (`{reverted}` vs `{deleted}`) — fine, but worth a one-line doc so API consumers branch correctly.

## Security & edge cases

- `fileFor` now bijective (the override-id slug bug is fixed and tested). Reference-guard only applies to custom deletes, which is correct (built-ins can't be referenced-away).

## Notes

Depends on N119; the locked tier is extended by N128 (status-transition by kind).
