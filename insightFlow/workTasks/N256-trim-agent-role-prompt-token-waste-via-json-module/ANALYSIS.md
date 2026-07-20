# N256 — Trim agent role-prompt token waste via JSON modules + fix template sync — Analysis

**Created:** 2026-07-18
**Author:** task-analyze

## Problem framing

The original request assumed the role prompts repeat boilerplate 10× across files. The scanner **corrected that premise**: the shared blocks are already `@`-included, so there's no per-file 10× waste. The genuine issues are (1) enforcement↔protocol content overlap that every prompt loads via includes, (2) a duplicated examples appendix in TASK_GIT, and (3) a real drift risk where `@`-included files are generated through two different paths. This is the lowest-payoff bucket (~170 tokens/prompt + a maintenance-hygiene fix), and the highest-fiddle one because the `.md` are generated and guarded by a test.

## Goal

- Remove redundant words from the generated prompts without changing any agent's behavior.
- Eliminate the two-sources-of-truth drift risk for `@`-included files.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Trim in the JSON modules, re-compose, fix sync script | Correct per the generation pipeline; `compose.test.mjs` stays honest; drift fixed | Must understand the compose pipeline; low payoff for the effort | S–M |
| B — Hand-edit the root `*_ROLE.md` directly | Fast | `compose.test.mjs` fails; edits overwritten on next `prompt-build`; wrong by construction | — |
| C — Skip it | No effort | ~170 tokens/prompt waste persists; drift risk stays | — |

## Decision

- Chosen option: **A**
- Rationale: B is simply invalid — the MD are generated and test-guarded, so the only correct edit point is the JSON modules. Given the low payoff, the drift fix (single source of truth for `@`-included files) is arguably the more durable win here, so it's bundled in. Sequenced last of the four.

## Open questions

- `[blocking]` Exact mapping from `src/agents/modules/*.json` → each generated role/enforcement file must be confirmed (read `compose.ts` header) before editing, so trims land in the right module.
- `[non-blocking]` The second generation path (`init/providers/skills.ts` + `sync-docs.mjs`) for `AGENT_ENFORCEMENT`/`AGENT_GIT`/`PR_API` — decide whether to route it through `sync-role-templates.mjs` or keep separate but derive from one source. Don't create a third path.
- `[non-blocking]` Token-savings estimate (~170/prompt) is rough; measure before/after to confirm it's worth keeping vs. dropping scope to just the drift fix.

## Sources

- None — discussion was self-contained. Findings from the in-repo ponytail audit (agents/prompt scanner), 2026-07-18. Note: the scanner explicitly corrected the requester's "10× duplication" premise.

## Handoff brief

Trim agent role-prompt token waste via JSON modules + fix template sync. type: refactor, priority: low, tags: prompt, tokens. In `src/agents/modules/*.json`: trim the enforcement module to its unique TOKEN EFFICIENCY block + a protocol pointer (removing HANDOVER/STRICT-MUTATIONS text that duplicates `AGENT_PROTOCOL.md`), cut the `TASK_GIT` EXAMPLES APPENDIX to a one-line `@PR_API.md` pointer, and drop the `TASK_ANALYZER` generic untrusted-data restatement. Fix `sync-role-templates.mjs` so the `@`-included files (`AGENT_ENFORCEMENT`/`AGENT_GIT`/`PR_API`) are single-source. Re-compose via `prompt-build --compose --apply` + sync; `compose.test.mjs` must stay green. No hand-edits to the root `.md`, no behavior changes.
