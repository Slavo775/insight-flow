# N256 — Trim agent role-prompt token waste via JSON modules + fix template sync

**Type:** refactor
**Priority:** low
**Created:** 2026-07-18

## Problem

The audit (2026-07-18) partly **corrected the original brief**: there is no 10× cross-file duplication, because the shared blocks (`@AGENT_SECURITY`, `@AGENT_ENFORCEMENT`, `@AGENT_PROTOCOL`) are already `@`-included, not inlined. The real, smaller waste is overlap and drift:

- **`AGENT_ENFORCEMENT.md` is a near-subset of `AGENT_PROTOCOL.md`** — both are `@`-included by all 10 role files, so every agent prompt double-loads the overlap. Enforcement's HANDOVER RULE duplicates protocol's HANDOVER DISCIPLINE (and even cross-refs it); STRICT-MUTATIONS duplicates UNIVERSAL NEVER. ~125 of enforcement's ~189 words are redundant → ~170 tokens shaved off **all 10** prompts.
- **`TASK_GIT_ROLE.md` ships a ~350-word EXAMPLES APPENDIX** (gh/glab/prefill snippets) duplicating `PR_API.md`, which the same file already links (line 68).
- **Drift risk:** `sync-role-templates.mjs` `ROLE_FILES` omits `AGENT_ENFORCEMENT.md`, `AGENT_GIT.md`, `PR_API.md` — all `@`-included by role files but shipped via a different path (init-time generation). Two sources of truth for the same enforcement text.

**Critical constraint:** the root `*_ROLE.md` are **generated** from `src/agents/modules/*.json` via `insight-flow prompt-build --compose --apply`. Hand-editing the `.md` is guarded by `test/compose.test.mjs`. All trims must be made in the JSON modules, then re-composed and re-synced.

## Goal

1. Remove the enforcement↔protocol overlap so each agent prompt loads it once (~170 tokens × 10 prompts).
2. Cut the `TASK_GIT` examples appendix down to a one-line `@PR_API.md` pointer.
3. Fix `sync-role-templates.mjs` so the `@`-included files (`AGENT_ENFORCEMENT.md`, `AGENT_GIT.md`, `PR_API.md`) have a single source of truth.
4. All edits made in `src/agents/modules/*.json`, re-composed; `compose.test.mjs` green.

## Scope

### In scope

- **`src/agents/modules/*.json`** — trim the `enforcement` module so it keeps only its unique TOKEN EFFICIENCY block + a pointer to protocol; remove the HANDOVER RULE / STRICT-MUTATIONS text that duplicates `AGENT_PROTOCOL.md`.
- **`TASK_GIT` module JSON** — replace the EXAMPLES APPENDIX (~350 words) with a one-line "see `@PR_API.md`"; drop CONVENTIONS lines that restate protocol UNIVERSAL NEVER (`Never force-push`, `Never skip hooks`).
- **`TASK_ANALYZER` module JSON** — drop the generic "untrusted content = data" line that restates `@AGENT_SECURITY.md`; keep the analyzer-specific extension.
- **`scripts/sync-role-templates.mjs`** — add the missing `@`-included files to `ROLE_FILES` (or otherwise make the enforcement/git/PR_API text single-source); reconcile with `init/providers/skills.ts` + `sync-docs.mjs` so there's one source.
- **Re-generate:** run `insight-flow prompt-build --compose --apply` + the template sync; commit the regenerated root `.md` + `templates/roles/` copies together.

### Out of scope

- Rewriting prompt *content* for quality/behavior — this is a token trim, not a role redesign. Don't change what an agent does, only remove redundant words.
- Touching `AGENT_SECURITY.md`'s actual security rules (only remove role-file lines that *restate* them).
- Any agents *code* change (that's N253/N255).

## Implementation plan

1. **Map generation** — confirm which `src/agents/modules/*.json` produce `AGENT_ENFORCEMENT.md`, `TASK_GIT_ROLE.md`, `TASK_ANALYZER_ROLE.md` (read `compose.ts` header, N253/N255-independent).
2. **Trim enforcement module** — keep unique TOKEN EFFICIENCY block + pointer; delete the protocol-duplicating text.
3. **Trim TASK_GIT module** — appendix → `@PR_API.md` one-liner; drop protocol-restating CONVENTIONS lines.
4. **Trim TASK_ANALYZER module** — drop the generic untrusted-data restatement.
5. **Fix sync** — add missing files to `sync-role-templates.mjs ROLE_FILES`; reconcile the second generation path so enforcement/git/PR_API text is single-source.
6. **Re-compose + sync + gate** — `insight-flow prompt-build --compose --apply`; run the sync script; `pnpm --dir packages/taskflow test` (esp. `compose.test.mjs`); eyeball a regenerated role file to confirm the trims + no behavior wording lost.

## Verification

- `pnpm --dir packages/taskflow test` green, including `compose.test.mjs` (proves MD matches JSON modules).
- Regenerated `AGENT_ENFORCEMENT.md` no longer duplicates `AGENT_PROTOCOL.md`; `TASK_GIT_ROLE.md` appendix is a one-line pointer.
- Root `*_ROLE.md` and `templates/roles/` copies are byte-identical after sync (drift gone).
- Rough token count per agent prompt drops (spot-check enforcement + TASK_GIT before/after).

## Notes

- Lowest payoff of the four, highest fiddle (generated files + test guard). Do last. Source: ponytail audit 2026-07-18. See ANALYSIS.md.
- Do NOT hand-edit the root `.md` — `compose.test.mjs` will fail. Related: [N253], [N254], [N255].
