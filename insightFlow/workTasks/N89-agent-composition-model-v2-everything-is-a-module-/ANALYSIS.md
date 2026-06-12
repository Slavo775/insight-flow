# N89 — Agent composition model v2 — everything is a module + registry — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

N88 greenlit "agent = core + stacked modules" but its model kept three primitives (sections, modules, includes/trailingIncludes) plus an implicit heading-targeted merge. The human's R4 review question — *"what is different between sections and modules?"* — exposed that the split is accidental, not essential. The actual goal of Round 2 (per N88's ANALYSIS.md roadmap, scope-amended by R4): collapse to one primitive and replace the hard-coded 4-module imports with a real registry, so Round 3 (migrating the 9 shipped roles) has a stable model to target. N88 also carried forward one unfinished item (playground behavioral validation) and four non-blocking review debts.

## Goal

- Composed-agent = single ordered `modules` list; sections → `kind: "section"`, includes → `kind: "include"`; pure-sequence rendering.
- Registry catalogues shared `@AGENT_*.md` partials + `recorder-discipline` + role-scoped modules, with a namespacing convention and dup-id guard.
- Reproduction of both hand-written roles still holds, now backed by a section-set test and one real playground run.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Keep v1 split model, just add registry | Smallest diff on N88 code | Preserves the accidental section/module/include split R4 explicitly rejected; merge semantics stay implicit; Round 3 migrates onto a wobbly model | S |
| B — Everything-is-a-module, pure sequence, registry-only (chosen) | One primitive; author controls placement explicitly; trivially maps to drag-and-drop UI (Round 5); registry uniform | Registry gains ~4–6 single-use role-scoped entries per role → needs namespacing + shared/role-scoped distinction | M |
| C — B + inline module objects mixed with id-refs | Avoids registry bloat from bespoke content | Two representations of "module" in every consumer (composer, future UI, future validation); human explicitly chose registry-only | M |

## Decision

- Chosen option: **B**.
- Rationale: R4 human direction (2026-06-11) — unify primitives and drop `includes`; registry-only confirmed by the human on 2026-06-11 over the analyzer's inline-hybrid suggestion (C). A is a non-option: it preserves the design R4 superseded. The registry-bloat cost of B is handled in-spec via `<role>/<slug>` namespacing. Behavioral validation is pulled into this round (human decision) so Round 3's migration isn't the first time a composed prompt meets reality.

## Open questions

- [non-blocking] Final namespacing shape: id-embedded (`task-implement/input-contract`) vs an explicit `scope`/`role` field on the module record. Implementer proposes; id-embedded assumed in the spec.
- [non-blocking] Does pure-sequence rendering preserve enough heading structure for semantic reproduction, or do section modules need a heading-level convention?
- [non-blocking] How rigorous must the playground run be to count as a pass? Minimum: composed `task-implement` drives one real task without violating the role contract; deviations recorded.
- [non-blocking] Which `@AGENT_*.md` partials beyond enforcement/protocol/events deserve registry entries now vs at Round 3 migration (security, notify, config) — catalogue cheaply if trivial, otherwise defer.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, read from repo 2026-06-11, trust: high):
- `workTasks/N88-agent-module-composer-spike/ANALYSIS.md` — Round 2 roadmap definition.
- `workTasks/N88-agent-module-composer-spike/REVIEW.md` — R4 "everything is a module" direction (human's exact wording + resolved Q&A); carried-forward behavioral-validation item; AI-review non-blocking debts #1–#4.
- `packages/taskflow/src/agents/compose.ts`, `src/core/schema/index.ts`, `src/agents/modules/*.json`, `src/agents/composed/*.json`, `test/compose.test.mjs` — N88 implementation under change (merged PR #63, commit 433848a).

## Handoff brief

> Title: Agent composition model v2 — everything is a module + registry · Type: feat · Priority: medium · Tags: agents, composer, schema, registry.
> Redesign the composition model so a composed-agent is a single ordered `modules` list — sections become `kind: "section"` modules, `includes`/`trailingIncludes` are eliminated, pure-sequence rendering. Registry-only modules: catalogue the existing `@AGENT_*.md` partials + new `recorder-discipline`; role-scoped modules get a namespacing convention; generalize the composer to consume the registry. Re-express N88's two composed agents in the new model with reproduction still holding (section-set test) and run one real playground behavioral validation. Sweep N88 review debt (dup-id guard, compose.ts comment, stronger test). Text-only; no role migration (Round 3), no MCP/hook/skill emission (Round 4), no UI (Round 5).
