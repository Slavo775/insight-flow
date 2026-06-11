# N89 — Agent composition model v2 — everything is a module + registry

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11

## Problem

- The N88 spike (PR #63) proved "agent = core + stacked modules" but left three primitives in the composed-agent model: `sections`, `modules`, and `includes`/`trailingIncludes`, plus implicit heading-targeted merge behavior. Human review R4 directed unification: **everything is a module**, one ordered list, pure-sequence rendering.
- The "registry" is hard-coded imports of 4 modules in `compose.ts` with no duplicate-id guard, and the existing shared `@AGENT_*.md` partials aren't catalogued as modules.

## Goal

1. One primitive: a composed-agent is a single ordered `modules` list of registry ids — `sections`, `includes`, and `trailingIncludes` fields are removed from the schema.
2. A real module registry cataloguing the shared `@AGENT_*.md` partials as include-modules, new `recorder-discipline` text module, and role-scoped section modules under a namespacing convention.
3. Composer becomes a pure-sequence renderer (each module = standalone block in declared order; heading-targeted merging dropped) consuming the registry.
4. Composed MD for `task-implement` + `task-review-fix` still semantically reproduces the hand-written roles, now verified by a normalized section-set test and one real playground behavioral run.
5. N88 review debt closed: duplicate-id guard, truthful `compose.ts` source-of-truth comment.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `AgentModuleSchema` (discriminated union `kind: "section" | "include"`), `ComposedAgentSchema` (ordered `modules: string[]` only).
- `packages/taskflow/src/agents/compose.ts` — registry construction (namespaced ids, shared vs role-scoped, dup-id guard in `indexById`), pure-sequence renderer, header comment fix.
- `packages/taskflow/src/agents/modules/*.json` — existing 4 modules migrated; new include-modules for `@AGENT_EVENTS.md` (and other `@AGENT_*.md` partials worth cataloguing); new `recorder-discipline`; role-scoped section modules extracted from the two composed agents.
- `packages/taskflow/src/agents/composed/task-implement.json`, `task-review-fix.json` — re-expressed as ordered module-id lists.
- `packages/taskflow/test/compose.test.mjs` — updated + strengthened.
- `packages/taskflow/src/index.ts` — barrel exports if schema names change.

### Out of scope

- Shipped role files (`TASK_*_ROLE.md`, `AGENT_*.md`) — untouched; hand-written roles stay canonical (migration is Round 3).
- MCP / hook / skill emission (Round 4); dashboard UI (Round 5); custom states.
- Inline (non-registry) modules — human decision: registry-only.
- `prompt-build`'s existing non-compose path (enforcement patcher + `agents.extend`).

## Implementation plan

1. **Schema redesign** (`core/schema/index.ts`) — `AgentModuleSchema` as discriminated union: `kind: "section"` (`id`, optional `heading`, `body`) and `kind: "include"` (`id`, `ref` like `@AGENT_ENFORCEMENT.md`). `ComposedAgentSchema`: `{ id, title, modules: string[] }`. Delete `sections` / `includes` / `trailingIncludes`.
2. **Registry with namespacing** (`compose.ts` + `modules/*.json`) — shared modules keep flat ids (`enforcement`, `protocol`, `events`, `minimal-diff`, `scope-guard`, `recorder-discipline`); role-scoped modules use `<role>/<slug>` (e.g. `task-implement/input-contract`). Build both maps through `indexById`, which now **throws on duplicate id**.
3. **Pure-sequence composer** — render each referenced module as a standalone block in declared order; include-modules emit their `@FILE.md` line verbatim. Remove heading-targeted bullet merging. Rewrite the header comment to state the spike-era reality (hand-written roles canonical until Round 3).
4. **Author module data** — `recorder-discipline` (cross-role theme from the N88 audit); `events` include-module; extract each section of the two composed agents into role-scoped section modules.
5. **Re-express composed agents** — `task-implement.json` + `task-review-fix.json` become ordered id lists mixing shared + role-scoped modules; both must still reference `minimal-diff` + `scope-guard` (reuse stays exercised).
6. **Tests** (`test/compose.test.mjs`) — normalized section-set comparison of composed MD vs the hand-written role (set + order of headings, no dropped role-specific content); dup-id guard throws; include rendering; declared-order rendering.
7. **Behavioral validation** — in `playground/`, drive one real task with the composed `task-implement` prompt; record the outcome (worked / deviations) in the PR body.

## Verification

- `pnpm build` and `pnpm --dir packages/taskflow test` pass (including new compose tests); lint clean.
- `insight-flow prompt-build --compose` emits MD for both agents; manual diff vs `TASK_IMPLEMENTER_ROLE.md` / `TASK_REVIEW_FIXER_ROLE.md` shows semantic-only deltas.
- Playground behavioral run completed and its outcome written into the PR body.

## Notes

- Round 2 of the agent-composer line: N88 (spike, merged PR #63) → **N89** → Round 3 (migrate 9 shipped roles, JSON canonical) → Round 4 (heterogeneous modules) → Round 5 (UI).
- Human R4 decision (2026-06-11) supersedes R3's "sections stay as-is": everything is a module, pure sequence, registry-only.
- See `ANALYSIS.md` in this folder for options considered and open questions.
- Drift caveat from N88 review stands: composed JSON duplicates role text until Round 3 — keep treating `agents/composed/*.json` as not-yet-canonical.
