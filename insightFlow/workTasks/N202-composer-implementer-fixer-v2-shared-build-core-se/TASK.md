# N202 — Composer implementer + fixer v2 — shared build core, self-contained context, checklist tracking, no-install guard

**Type:** feat
**Priority:** high
**Created:** 2026-07-06

## Problem

The composer (authoring) flow's **Implementer** (`authoring-implement/identity`) and **Fixer** (`authoring-fix/identity`) roles are thin and under-specified. They do not state their hard boundaries, so an agent can drift: read the insight-flow source it does not need, install definitions (which must be a separate, later step), or do work outside "build the customization." The two roles duplicate the same intent but share no common core. The Implementer also does not follow the checklist the Composer Taskmaster produces or track progress to "all boxes ticked."

Requirements to encode (from the human):
- Self-contained context: the Implementer/Fixer must NOT need to read the insight-flow project — everything to build is in the spec + checklist + composer conventions. If any composer-flow agent needs to look into the project, that is a bug to surface, not normal behavior.
- Uses the composer **stdio** MCP (already wired via `composer-mcp-note`).
- **Never installs** anything (agent / flow / module) — installation is a separate agent (`authoring-install`). Strictly prohibited here.
- Follows the task **spec AND the checklist**; the checklist of implementer subtasks is provided by the Composer Taskmaster. If it is not there, that gap is fixed in the Taskmaster (this task does that too).
- Ends with **every checkbox ticked**, tracking progress as it goes.
- Scope = create the agents/flows/modules and wire the **relationships** so each agent and its subagents know exactly how to run. Anything unrelated is prohibited — stop.
- May make **small adjustments** to agents (a few lines within a single file).
- The Fixer shares the **same core** as the Implementer (one shared module, not duplicated prose).

## Goal

1. A new shared **`authoring-build/core`** section module holds the common build discipline (self-contained context, no-install guard, scope-lock, small-adjustment allowance, spec+checklist obligation).
2. `authoring-implement/identity` and `authoring-fix/identity` are trimmed to their role-specific bits and both compose `authoring-build/core`.
3. The Composer Implementer follows the checklist and finishes with all implementer-subtask checkboxes ticked, tracking progress.
4. The Composer Taskmaster emits the implementer subtasks as real markdown **checkboxes** so there is a checklist to tick.
5. Authoring docs describe the updated Implementer/Fixer behavior and the shared core.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/roles/authoring.json` — add `authoring-build/core`; edit `authoring-implement/identity` and `authoring-fix/identity`.
- `packages/taskflow/src/agents/composed/authoring.json` — add `authoring-build/core` to the `modules` list of both `authoring-implement` and `authoring-fix`.
- `packages/taskflow/src/agents/modules/authoring-spec-structure.json` — make "Implementer subtasks" a checkbox (`- [ ]`) list the implementer ticks.
- `website/docs/authoring/agents-and-subagents.md` (rows 29 & 31) and `walkthrough.md` — update Implementer/Fixer descriptions; mention the shared core, checklist tracking, and the no-install / self-contained / stop-on-scope guards.

### Out of scope

- The base-product roles at repo root (`TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`) and `templates/roles/` — those are the normal task flow, not the composer flow. Do NOT touch.
- The composer MCP server (`mcp/composer.ts`), the author subagents, and the analyst (N200) / taskmaster-structure (N201) logic beyond the checkbox tweak above.
- Any change to the flow graph / statuses in `project/authoring.json`.
- Actually running the composer flow or installing anything.

## Implementation plan

1. **Add the shared build core module.** In `modules/roles/authoring.json`, add a new section object `authoring-build/core` (`kind: "section"`, `source: "builtin"`, `heading: "## Build discipline (implementer + fixer)"`). Body must state, in plain English:
   - You have everything you need in the approved **spec + checklist + composer conventions**. Do NOT read the insight-flow project source to do this work. If you find you genuinely need to look into the project, STOP and report it as a likely bug in the spec/agent — do not work around it.
   - You author through the **composer stdio MCP** only (via the per-kind author subagents).
   - **Never install.** Installing any agent / flow / module is strictly prohibited here; a separate installer agent does that after approval.
   - **Scope-lock:** your only job is to create/adjust the modules, agents, flows, and the **relationships** between them so each agent and its subagents know exactly how to run. Any task not part of building this customization is prohibited — stop and hand back.
   - **Small adjustments allowed:** you may make small edits to an agent (a few lines within one file) when the spec calls for it; anything larger is out of scope.
   - **Follow the checklist:** work the implementer-subtask checklist item by item, tick each box as you complete it, and only finish when every box is checked.
2. **Trim + rewire the Implementer.** Edit `authoring-implement/identity` body to keep only: delegate to the 4 author subagents, `custom:` ids / reuse, baseline composition, handover `when`, and the `implement-start` / `implement-end` lifecycle. Remove the "Do NOT install" sentence (now in the core). Add one line: follow the checklist and finish with all boxes ticked.
3. **Trim + rewire the Fixer.** Edit `authoring-fix/identity` body to keep only: apply review blockers via the author subagents, touch only what review flagged, `fix-start` / `fix-end` lifecycle, hand back to review. Rely on the core for the shared guards.
4. **Compose the core.** In `composed/authoring.json`, add `"authoring-build/core"` to the `modules` arrays of `authoring-implement` and `authoring-fix` (place it right after the identity module, before `composer-mcp-note`).
5. **Taskmaster checklist as checkboxes.** In `authoring-spec-structure.json`, change the **Implementer subtasks** bullet so it says the subtasks are written as a markdown checkbox list (`- [ ]`, one binary step each) that the Composer Implementer ticks off as it builds.
6. **Docs.** Update `website/docs/authoring/agents-and-subagents.md` rows for Composer Implementer (29) and Composer Fixer (31) to reflect the shared build core, self-contained context, no-install guard, scope-lock, and checklist tracking. Add a short note in `walkthrough.md` where the implement step is described.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds (role/module JSON is valid and composes).
- `insight-flow` composes the `authoring-implement` and `authoring-fix` agents without error and both prompts include the `authoring-build/core` section (render/preview the composed prompt).
- Grep confirms `authoring-build/core` is listed in both agents' `modules` in `composed/authoring.json`.
- Read the rendered Implementer prompt: it forbids installing, forbids reading the project, locks scope to building customizations, allows small edits, and requires ticking every checklist box.
- Docs mention the shared core + guards.

## Notes

- Builds on **N200** (composer analyze v2) and **N201** (composer taskmaster v2, which added the implementer-subtask list + `authoring-spec-structure`). This is the implement/fix half of the same v2 pass.
- The composer flow = built-in flow `composer-authoring`; agents are `authoring-*`. Roles live in `packages/taskflow/src/agents/modules/roles/authoring.json`; composition in `composed/authoring.json`.
- The shared "core" is a composable **module**, matching how the codebase already factors shared discipline (`security` / `enforcement` / `protocol` / `template-copy`).
- This task itself is a normal edit of built-in role/module JSON — it does NOT run the composer flow.
