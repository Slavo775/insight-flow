# N91 — Unify near-duplicate role wording onto shared modules — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

N90's byte-exact migration empirically confirmed the N88 audit: zero verbatim cross-role wording. The composer's dedup payoff therefore requires *making* the wording shared — a deliberate prompt rework that was unsafe before (editing 9 hand-written files, no drift guard) and is now cheap (edit JSON once, regenerate, review one diff). The symptom is "shared modules have zero referents"; the cause is historical wording drift across roles that all express the same three disciplines: minimal-diff, scope-guard, recorder-discipline.

## Goal

- Each shared discipline module referenced by ≥2 roles; near-duplicates collapsed; nuance preserved as role-scoped qualifiers.
- The regenerated role-MD diff is the entire reviewed behavior change — nothing else moves.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Leave duplicated (status quo) | Zero risk | Composer line never delivers text dedup; 9-file edits for cross-role changes persist | — |
| B — Unify now, content-only (chosen) | Drift test + single-diff review make it safe; small; gives Round 4 a cleaner registry | Shipped prompt wording changes (behavioral risk, mitigated by per-role semantic review) | S–M |
| C — Unify inside Round 4 | One PR fewer | Mixes content rework into a schema/emission task — review surface muddied; the exact wrong place for prompt diffs | — |

## Decision

- Chosen option: **B**, ordered before Round 4 (human direction 2026-06-11: "check Round 4 and wording unification, hand over to taskmaster").
- Rationale: content-only risk profile, exercises the new canonical-JSON editing workflow end-to-end for the first time, and untangles prompt-content review from Round 4's schema review.

## Open questions

- [non-blocking] Adoption set per module — final call sits with the implementer's inventory (step 1); the spec lists the candidates but a bullet that can't read naturally in shared form stays role-scoped.
- [non-blocking] `recorder-discipline` currently has three bullets — incident/request-changes may only support two of them semantically; splitting the module is allowed if needed (it has no referents yet, so reshaping is free).
- [non-blocking] Whether the taskmaster/analyzer roles adopt `scope-guard` ("ambiguous → ask") too — only if the existing bullet is a true near-duplicate.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `workTasks/N90-…/REVIEW.md` — "zero cross-role byte-level section duplication … real text sharing arrives when wording is intentionally unified (the deferred wording task)".
- `packages/taskflow/src/agents/modules/` — the three shared modules + 49 role-scoped modules under change.
- The 9 generated `*_ROLE.md` files — the near-duplicate bullets quoted in TASK.md step 1.

## Handoff brief

> Title: Unify near-duplicate role wording onto shared modules · Type: rework · Priority: medium · Tags: agents, composer, prompts, wording.
> Content-only rework: collapse near-duplicate role bullets onto the three shared discipline modules (minimal-diff, scope-guard, recorder-discipline), preserving role nuance as role-scoped qualifiers. Regenerate role MD via compose-apply; the MD diff is the review artifact; drift suite stays green; templates re-synced. No schema/composer/CLI changes; Round 4 emission is the separate N92.
