# N119 — Eject/override loader — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`readKind` (user-registry.ts) now treats a non-`custom:` id matching a shipped
built-in as an eject/override (added to `overrides`, source stays `builtin`);
locked ids and unknown non-custom ids are rejected. Merged registries reflect
overrides via spread order. Solid, minimal, and the loading semantics are clear.

## Checklist verification

- [x] insightFlow/ override shadows the shipped def (override-first, package fallback) — verified in `user-registry.test.mjs`.
- [x] LOCKED ids rejected as overrides; unknown non-custom ids rejected with a clear message.
- [x] Custom (`custom:`) ids unchanged; merged registries reflect overrides.

## Blockers

None.

## Non-blocking

- The lock set is duplicated client-side (`LOCKED_MODULE_IDS` mirrored in forms) because user-registry pulls `node:fs` — acceptable, but a shared constants module (zod/fs-free) would remove the drift risk. N128 later extends this to lock-by-kind cleanly.

## Security & edge cases

- Path/slug safety preserved via `DefinitionIdSchema`. Duplicate-id within a kind throws. Override detection is exact-id match — no traversal surface.

## Notes

Foundation for the whole Epic 1 eject/override model; consumed by N120/N121/N128.
