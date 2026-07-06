# N201 — Composer Taskmaster v2 — specialized spec-writer + templated scaffolding + change-handling

**Type:** feat
**Priority:** medium
**Created:** 2026-07-03

## Problem

- Sibling to N200 (which rewrote the composer flow's **analyze** agent). The composer flow's taskmaster — `authoring-create` ("Composer Taskmaster", an entry agent of `composer-authoring`) — is thin: it only **creates** a spec, has **no detailed spec structure**, and doesn't handle **changes** to an existing spec. It also doesn't reliably scaffold-then-fill from templates, so authored tasks can drift in structure.
- The template system already exists (`templates/task/*.tpl` + `insight-flow create` scaffolds TASK/CHECKLIST/ANALYSIS; `review-start` scaffolds REVIEW) — but there is no shared, composable **spec-structure** for authoring specs, and no convention that makes **every** taskmaster (built-in or custom-authored) reuse the templates consistently.

## Goal

1. `authoring-create` becomes a specialized spec-writer that handles **both create and change** in one agent, driven by the analyst's per-kind brief (no new subagents).
2. It **scaffolds via `insight-flow create` then fills each section** (never writes files from scratch), producing a **detailed authoring spec**: description · goal · full inventory (modules · subagents · agents · flows · relationships) · per-item little tasks for the implementer · verification.
3. Two new composable section modules ship: **`authoring-spec-structure`** (the shared spec template) and **`template-copy`** (the scaffold-then-fill discipline).
4. A composer-conventions rule makes **every taskmaster compose `template-copy` by default** (opt-out only), with `authoring-spec-structure` added for authoring taskmasters; the `agent-author` subagent follows this when authoring custom taskmasters.
5. The authoring docs describe the new spec structure, the change-handling, and the templated-every-taskmaster convention.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/roles/authoring.json` — rewrite `authoring-create/identity`: create-vs-change detection, scaffold-then-fill via `insight-flow create` + `set-flow`, the detailed spec structure, synthesize from the analyst brief, gated handoffs (implement; back to analyze if no brief).
- New section modules **`template-copy`** and **`authoring-spec-structure`** under `packages/taskflow/src/agents/modules/` (flat ids; source `builtin`).
- `packages/taskflow/src/agents/compose.ts` — register both modules.
- `packages/taskflow/src/agents/composed/authoring.json` — compose `template-copy` + `authoring-spec-structure` into `authoring-create` (and keep `plain-language`).
- `packages/taskflow/src/agents/composer-conventions.ts` — a "taskmasters are templated by default" convention (compose `template-copy` unless opted out; `authoring-spec-structure` for authoring taskmasters).
- `packages/taskflow/src/agents/modules/integrations/composer-subagents.json` — `agent-author` guidance to include `template-copy` when authoring a taskmaster.
- `packages/taskflow/test/compose.test.mjs` — assertions for the new modules + composition + convention.
- `website/docs/authoring/*` — walkthrough "create the spec" step, taskmaster description, spec-structure + change-handling + templated-convention notes.

### Out of scope

- Base product `taskmaster` / `taskmaster-change` roles — they already scaffold via `insight-flow create`; **left as-is**.
- The analyze agent (done in N200); new schema / flow primitives; new per-kind subagents (reuse the analysts).
- The `insight-flow create` scaffolding code itself — reuse it, do not extend it.

## Implementation plan

1. **Author `template-copy`** (`modules/`) — a `section` module: "Scaffold task files with `insight-flow create` (it copies `templates/task/*.tpl` — TASK/CHECKLIST, +ANALYSIS with `--with-analysis`; REVIEW comes from `review-start`), then **fill** each scaffolded section with Edit; never Write a task file from scratch, so every task keeps the same structure."
2. **Author `authoring-spec-structure`** (`modules/`) — a `section` module defining the detailed authoring-spec layout to fill into TASK.md/CHECKLIST.md: **Description · Goal · Inventory** (Modules · Subagents · Agents · Flows · Relationships, each item with what to build) · **Implementer subtasks** (little tasks per item) · **Verification**.
3. **Register** both in `compose.ts` `MODULE_REGISTRY`; **compose** them into `authoring-create` in `composed/authoring.json` (order: identity, `template-copy`, `authoring-spec-structure`, composer-mcp-note, conventions, baseline trio, plain-language, handovers, actions).
4. **Rewrite `authoring-create/identity`** — create-vs-change in one agent; scaffold-then-fill; synthesize the spec (with the full inventory + implementer subtasks) from the analyst brief; `insight-flow create … && set-flow --flow composer-authoring`; on change, Edit the existing TASK.md/CHECKLIST.md; gated handoff to implement, back to analyze if no brief.
5. **Convention** (`composer-conventions.ts`) — add: "A taskmaster (an agent that creates/changes tasks) composes `template-copy` by default (opt-out only); authoring taskmasters also compose `authoring-spec-structure`." Point the `agent-author` subagent at this so custom-authored taskmasters inherit it.
6. **Docs** (`website/docs/authoring/`) — update walkthrough step 2 + `agents-and-subagents.md` taskmaster entry; add the spec structure, change-handling, and templated-every-taskmaster convention.
7. **Tests** — `authoring-create` composes `template-copy` + `authoring-spec-structure`; both modules registered as `section`; convention text present; drift guard on the 9 shipped roles still holds.

## Verification

- `pnpm build` + `pnpm --dir packages/taskflow test` pass (incl. new N201 assertions); typecheck + `eslint src` clean.
- `insight-flow prompt-build --compose authoring-create` renders the create-vs-change behavior, the scaffold-then-fill discipline, and the detailed spec structure (Inventory + Implementer subtasks).
- Docusaurus build passes (no broken links).
- The 9 shipped role MD files stay byte-identical (drift guard) — the changed modules compose only into the authoring flow.

## Notes

- Sibling of **N200** (composer analyze v2). **Build on the `agents-approved` branch** (which contains N200), not `main` — otherwise it conflicts with / duplicates N200's composer-flow changes.
- Human decisions (2026-07-03): reuse `insight-flow create` + a prompt module (no new copy code); reuse the analyst brief (no new subagents); one agent handles create + change; one task off `agents-approved`.
- The "template" the user asked for = composable **section modules** (`authoring-spec-structure` shared spec + `template-copy` discipline), not new scaffolding code.
- See `ANALYSIS.md` for options + open questions.
