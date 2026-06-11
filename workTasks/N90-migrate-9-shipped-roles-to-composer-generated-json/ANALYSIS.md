# N90 — Migrate 9 shipped roles to composer-generated (JSON canonical) — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

The composer line (N88 spike → N89 v2 model) proved "agent = ordered modules" but stopped short of consumption: the 9 hand-written role files remain canonical and the JSON copies drift (N89 review non-blocking #1). The actual goal of Round 3 is the payoff the whole line was built for — edit a shared module once, all roles update — which requires flipping the source of truth without changing a single shipped prompt byte. The risk profile inverts here: N88/N89 were additive; N90 rewrites how the shipped prompts are produced.

## Goal

- All 9 roles composer-generated, byte-identical to today's hand-written files at switchover.
- Committed generated MD + explicit compose-apply command + byte-exact drift test (no build-time generation).
- Distribution (`sync-role-templates.mjs` → `templates/roles/` → `init`) and `agents.extend` marked-block injection unaffected.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Incremental migration (2–3 roles per task) | Smaller PRs; early rollback points | Mixed-canonical limbo across tasks (some roles JSON-canonical, some not — confusing enforcement story); repeated wiring overhead; composer already proven twice | M × 3–4 |
| B — All 9 in one task, byte-exact, committed output (chosen) | One switchover, one review artifact (empty diff over 9 files); drift test covers everything at once; mechanical per-role work gated by byte-diff | Big task (~45–55 new modules); single large PR | L |
| C — Semantic-exact (accept whitespace/wording deltas, e.g. generic shared NEVER bullets) | Less module duplication; smaller registry | Shipped prompts change at switchover → behavioral risk + harder review; drift test can't be byte-exact; human explicitly rejected | L |

## Decision

- Chosen option: **B** (human decisions 2026-06-11: byte-exact; one task; commit generated output, compose-once not build-time).
- Rationale: byte-exactness turns the highest-risk round into a mechanically verifiable one — the acceptance criterion is an empty `git diff` over the 9 role files plus a permanent byte-equality drift test. The cost (role-scoped modules where wording deviates from shared modules) is bounded and explicit; shared-wording adoption is deferred to a post-migration wording task where prompt changes can be reviewed as prompt changes.

## Open questions

- [non-blocking] Renderer continuation rule shape: blanket "body-only section module joins previous section block" vs an explicit flag on the module — implementer decides; blanket rule assumed (analyzer recommendation (b), accepted by human).
- [non-blocking] `agents.extend` marked blocks: confirm whether markers live inside role-file text (then they're just module body content) or are injected by `prompt-build` at apply time — drives step 2 of the plan.
- [non-blocking] Which shared include-modules the 9 roles actually need beyond enforcement/protocol/events (`notify`, `config`, `security`, `pr-api`) — catalogue from the files during decomposition, don't pre-register unused ones.
- [non-blocking] `recorder-discipline` may match zero roles byte-for-byte — if so it stays inert (acceptable; broader adoption is the future wording task).

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `workTasks/N88-agent-module-composer-spike/ANALYSIS.md` — Round 3 roadmap definition ("migrate the 9 shipped roles to generated; highest behavioral risk").
- `workTasks/N89-agent-composition-model-v2-everything-is-a-module-/REVIEW.md` — carried-over non-blocking items #1–#4 this task closes.
- `packages/taskflow/src/agents/compose.ts`, `modules/`, `composed/`, `test/compose.test.mjs` — the v2 implementation under extension (merged PR #64).
- `packages/taskflow/src/cli/commands/prompt-build.ts`, `src/agents/agents.ts` (`applyAgentExtensions`, `AGENT_ROLE_FILE_MAP`), `scripts/sync-role-templates.mjs` — the consumption + distribution machinery that must keep working.

## Handoff brief

> Title: Migrate 9 shipped roles to composer-generated (JSON canonical) · Type: feat · Priority: medium · Tags: agents, composer, migration, registry.
> Round 3: flip the source of truth — all 9 shipped role files become composer-generated from JSON modules, byte-identical to the current hand-written files at switchover (role-scoped modules preserve exact wording; renderer gains a body-only continuation rule). Generated MD is committed via an explicit `prompt-build --compose --apply` command (never build-time); a drift test asserts committed == composed byte-exact. Distribution (`sync-role-templates.mjs` → `templates/roles/` → `init`) and `agents.extend` marked-block injection must survive. Out of scope: wording changes, MCP/hook/skill emission (Round 4), UI (Round 5).
