# N91 — Unify near-duplicate role wording onto shared modules

**Type:** rework
**Priority:** medium
**Created:** 2026-06-11

## Problem

- N90 proved there is zero byte-level wording shared across the 9 roles, so the shared section modules (`minimal-diff`, `scope-guard`, `recorder-discipline`) have no referents — every role carries its own near-variant of the same disciplines. Each cross-role behavior change still means editing up to 9 module bodies.
- Now that JSON is canonical and drift-guarded (N90), wording can be unified deliberately: the regenerated `*_ROLE.md` diff is reviewable as an intentional prompt change.

## Goal

1. Shared disciplines referenced from roles instead of duplicated: `minimal-diff`, `scope-guard`, and `recorder-discipline` each gain real referents.
2. Role-specific nuance is preserved where it matters — as a role-scoped bullet kept alongside the shared module, not by widening the shared wording.
3. Regenerated role MD committed together with the JSON; drift suite green; the role-MD diff in the PR is the reviewed artifact.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/{minimal-diff,scope-guard,recorder-discipline}.json` — wording may be adjusted once (shared text must read correctly in every adopting role).
- `packages/taskflow/src/agents/modules/roles/*.json` — replace near-duplicate bullets with shared refs; keep/trim role-scoped remainder modules.
- `packages/taskflow/src/agents/composed/*.json` — insert shared module ids at the right sequence positions.
- The 9 root `*_ROLE.md` — regenerated via `prompt-build --compose --apply` only.
- `packages/taskflow/templates/roles/` via `scripts/sync-role-templates.mjs`.
- `packages/taskflow/test/compose.test.mjs` — only if a structural assertion references old wording.

### Out of scope

- Any wording change that is not a unification of an existing near-duplicate (no new rules, no tone rewrites).
- Schema, renderer, or CLI changes (composer is frozen this task).
- MCP/hook/skill emission (N92 / Round 4); UI (Round 5).
- `AGENT_*.md` partial contents.

## Implementation plan

1. **Inventory near-duplicates** — table of role bullets vs the three shared modules: implementer NEVER change-mode bullet + fixer NEVER bullets vs `minimal-diff`; implementer/fixer SCOPE GUARD ask/ambiguity bullets vs `scope-guard`; human-review/incident/request-changes "never invent / exact wording / never decide for the human" bullets vs `recorder-discipline`. Classify each: adopt-shared / keep-role-qualifier / leave-as-is.
2. **Settle shared wording** — adjust the three shared module bodies once so they read correctly in every adopting role (e.g. minimal-diff must make sense for both implement and review-fix contexts). Continuation rule (N90 renderer) means shared bullets join the preceding role list without a blank line.
3. **Rewire roles** — edit `modules/roles/*.json` (drop adopted bullets, keep qualifiers) and `composed/*.json` (insert shared ids at the exact position the dropped bullets occupied, so section ordering reads naturally).
4. **Regenerate** — `prompt-build --compose --apply`; commit regenerated MD with the JSON. Review each role's MD diff for semantic equivalence; anything that reads as a behavior change beyond unification → revert that adoption.
5. **Sync templates** — `scripts/sync-role-templates.mjs`; commit template updates.
6. **Gates** — build, full test suite (drift test must pass against the regenerated files), lint.

## Verification

- Drift suite green: committed MD == composer output for all 9 roles.
- `git diff` over `*_ROLE.md` shows only the unified bullets (the review artifact) — no unrelated text drift.
- Each of the three shared modules referenced by ≥2 composed agents (checked in registry/test).
- `sync-role-templates.mjs` reports the regenerated roles copied.

## Notes

- Follows N90 (PR #65); must branch from a main that contains it.
- The N90 review predicted this: "real text sharing arrives when wording is intentionally unified… now safe behind the drift test."
- Companion task: N92 (Round 4 — heterogeneous modules). Implement N91 first — both touch module JSON.
- See `ANALYSIS.md` for the candidate inventory and decision rationale.
