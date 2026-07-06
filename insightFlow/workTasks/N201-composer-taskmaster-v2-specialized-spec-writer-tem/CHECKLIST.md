# N201 — Composer Taskmaster v2 — specialized spec-writer + templated scaffolding + change-handling — Checklist

## Done criteria

- [x] `authoring-create/identity` rewritten: handles **create and change** in one agent (existing spec → change; none → create).
- [x] It **scaffolds via `insight-flow create` then fills** each section (never Writes a task file from scratch); binds the task with `set-flow --flow composer-authoring`.
- [x] The spec structure it produces includes: Description · Goal · **Inventory** (Modules · Subagents · Agents · Flows · Relationships) · **Implementer subtasks** (little tasks per item) · Verification.
- [x] It synthesizes from the analyst's per-kind brief — **no new subagents** added.
- [x] New `section` module **`template-copy`** authored + registered in `compose.ts`.
- [x] New `section` module **`authoring-spec-structure`** authored + registered in `compose.ts`.
- [x] Both composed into `authoring-create` (`composed/authoring.json`); `plain-language` retained.
- [x] `composer-conventions.ts` states taskmasters compose `template-copy` by default (opt-out only) + `authoring-spec-structure` for authoring taskmasters; `agent-author` subagent guidance references it.
- [x] Authoring docs updated (walkthrough create-spec step, taskmaster description, spec-structure + change-handling + templated-convention).

## Quality gates

- [x] `pnpm build` passes
- [x] `pnpm --dir packages/taskflow test` passes (321/321, incl. 2 new N201 assertions)
- [x] `pnpm --dir packages/taskflow run typecheck` clean; `eslint src` 0 errors (2 pre-existing warnings in untouched `FlowEditor.tsx`)
- [x] Docusaurus build passes (no broken links)
- [x] Drift guard holds: the 9 shipped role MD files stay byte-identical
- [x] No regressions in the other 7 authoring agents' composed output (full suite green)

## Verification

- [x] Composed `authoring-create` renders create-vs-change, scaffold-then-fill, and the detailed spec structure (Inventory + Implementer subtasks) — smoke-checked.
- [x] Test asserts `authoring-create` composes `template-copy` + `authoring-spec-structure`, both registered as `section` modules.
- [x] Built on the `feat/N201` branch cut from `agents-approved` (contains N200).
