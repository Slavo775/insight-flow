# N201 — Composer Taskmaster v2 — specialized spec-writer + templated scaffolding + change-handling — Analysis

**Created:** 2026-07-03
**Author:** task-analyze

## Problem framing

- **Symptom:** the human wants the composer flow's taskmaster to be a specialized spec-writer with per-kind coverage, a detailed spec, a shared template, "copy-paste every file" behavior, change-handling, and docs.
- **Cause / real state:** insight-flow already ships the copy-paste-fill template system — `templates/task/*.tpl` + `insight-flow create` (`scaffoldTaskDocs`) copy TASK/CHECKLIST/ANALYSIS into the folder, and `review-start` scaffolds REVIEW. So "a module for copying the default task md" is *mostly already code*. The genuine gaps are: (1) no **detailed authoring-spec structure** (inventory of modules/agents/flows/relationships + implementer subtasks), (2) `authoring-create` doesn't reliably **scaffold-then-fill**, (3) no **change-handling** in the composer flow, (4) no **convention** that every taskmaster reuses the templates by default.
- This is the sibling of **N200** (which did the composer **analyze** agent); it targets the composer **taskmaster** (`authoring-create`).

## Goal

1. `authoring-create` handles **create + change** in one agent, synthesizing a **detailed spec** (description · goal · inventory of modules/subagents/agents/flows/relationships · per-item implementer subtasks · verification) from the analyst brief — no new subagents.
2. **Scaffold-then-fill** discipline: run `insight-flow create`, then fill each templated section (never write from scratch).
3. Two shared, composable section modules: **`authoring-spec-structure`** (the spec template) and **`template-copy`** (the discipline).
4. A convention so **every taskmaster is templated by default** (opt-out only); `agent-author` applies it to custom-authored taskmasters.
5. Authoring docs updated.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Reuse `insight-flow create` + two section modules; one agent does create+change; reuse analyst brief (chosen) | No new copy code; templates already exist; section modules are the natural shareable unit; fewer agents/subagents | Convention (not hard schema) enforces "every taskmaster"; one agent carries two modes | M |
| B — New scaffolding code (a `template-copy` CLI/feature) + 4 spec subagents + separate `authoring-change` agent | Parallel spec-writing; explicit change agent mirrors base flow | Duplicates existing `create` scaffolding + the analyst subagents; more surface, bigger blast radius | L |
| C — Prompt-only tweak to `authoring-create`, no new modules | Smallest | No shared/reusable template; no "every taskmaster" mechanism; misses the human's template + change asks | S |

## Decision

- **Chosen: A.** Reuse the existing template scaffolding; express the "template" as two composable **section modules** (`authoring-spec-structure` + `template-copy`); one agent handles create + change; synthesize from the analyst brief (no new subagents); a composer-conventions rule makes taskmasters templated by default.
- **Rationale:** the copy-paste-fill system already exists in code — rebuilding it (B) duplicates `scaffoldTaskDocs` and the analyst subagents for no gain. Section modules are insight-flow's shareable/composable unit, so they satisfy "a template that can be shared with all taskmasters" without new primitives. One create+change agent matches the human's "taskmaster handles changes too" and keeps the flow small. C is too thin (no reusable template, no every-taskmaster mechanism).
- **User forks resolved (2026-07-03):** template = reuse create + prompt module; subagents = reuse analyst brief; change = one agent; scope = one task on `agents-approved`.

## Open questions

- `[non-blocking]` "Every taskmaster templated" has **no schema marker** for "taskmaster" — it's enforced by convention + the `agent-author` subagent guidance (and optionally a `taskmaster-baseline` bundle grouping the two modules). Confirm convention-level enforcement is acceptable (it is, per the human's "unless user says otherwise").
- `[non-blocking]` Split of the two modules: `template-copy` is generic (any task); `authoring-spec-structure` is composer-specific. The base product taskmaster is intentionally left untouched (it already scaffolds via `create`).
- `[non-blocking]` Base branch is `agents-approved` (has N200). If N200 later merges to `main`, rebase N201 accordingly.

## Sources

- None — discussion was self-contained (grounded in the repo: `packages/taskflow/templates/task/*.tpl`, `src/cli/commands/create.ts` `scaffoldTaskDocs`, `src/agents/composed/authoring.json`, `modules/roles/{taskmaster,taskmaster-change,authoring}.json`). No external URLs.

## Handoff brief

- **Title:** Composer Taskmaster v2 — specialized spec-writer + templated scaffolding + change-handling
- **Type:** feat · **Priority:** medium · **Tags:** authoring, composer, taskmaster · **Base:** `agents-approved`
- **Scope:** Rewrite the composer flow's `authoring-create` ("Composer Taskmaster") into a specialized spec-writer that handles create + change in one agent, scaffolds via `insight-flow create` then fills each section, and produces a detailed authoring spec (description · goal · inventory of modules/subagents/agents/flows/relationships · per-item implementer subtasks · verification), synthesized from the analyst brief (no new subagents). Add two composable section modules — `authoring-spec-structure` (shared spec template) and `template-copy` (scaffold-then-fill discipline) — plus a composer-conventions rule making every taskmaster templated by default (opt-out only; `agent-author` applies it to custom taskmasters). Update the authoring docs. Out of scope: base `taskmaster`/`taskmaster-change` (already scaffold via create), the analyze agent (N200), new schema/subagents, and extending the `create` scaffolding code.
