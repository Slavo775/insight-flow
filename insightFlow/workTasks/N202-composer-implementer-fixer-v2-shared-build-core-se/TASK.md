# N202 — Composer implementer + fixer v2 — shared build core, self-contained context, checklist tracking, no-install guard

**Type:** feat
**Priority:** high
**Created:** 2026-07-06

> **Spec updated 2026-07-07 to match what shipped.** The design evolved through four human-review rounds (see `REVIEW.md`): the separate Composer Fixer was **removed** and the Composer Implementer now **builds *and* fixes**. This section describes the **final** design. The original plan (a separate Fixer sharing a core with the Implementer) is kept under "Design evolution" at the bottom for history. The task title still reads "implementer + fixer" for continuity.

## Problem

The composer (authoring) flow's **Implementer** (`authoring-implement/identity`) and the then-separate **Fixer** (`authoring-fix/identity`) roles were thin and under-specified. They did not state their hard boundaries, so an agent could drift: read the insight-flow source it does not need, install definitions (which must be a separate, later step), or do work outside "build the customization." They duplicated the same intent with no shared core, and the Implementer neither followed the Taskmaster's checklist nor tracked progress to "all boxes ticked." A separate Fixer was also unnecessary ceremony — one agent can build and fix.

Requirements to encode (from the human, across all rounds):
- **One agent builds and fixes.** Remove the separate Fixer; the Implementer handles both. Both AI-review and human-review `fix-needed` route back to the Implementer.
- **Self-contained context:** the Implementer should not *need* to read the insight-flow project — everything is in the spec + checklist + composer conventions. Reading it is **not strictly forbidden**, but needing to signals a **bug in the agent/spec** to surface and fix, not to work around.
- Uses the composer **stdio** MCP (via `composer-mcp-note`).
- **Never installs** anything — installation is the separate `authoring-install` agent. Strictly prohibited here.
- Follows the task **spec AND the checklist** (implementer subtasks, provided by the Composer Taskmaster as real checkboxes), ending with **every checkbox ticked**, tracking progress.
- Scope = **create and update** the custom modules/agents/flows and their **relationships/handovers**. Anything unrelated is prohibited — stop and hand back.
- **Small adjustments:** the user can call the Implementer **directly, without the taskmaster**, for a small change; larger work goes analyze → taskmaster first.
- **MCP secrets:** the guidance must tell the user they can add a `${VAR}` secret **either** via the dashboard install UI (prompts/masks/writes `secrets.local.json`) **or** by hand-editing `.insight-flow/secrets.local.json` (per-project, gitignored; never the global `~/.insight-flow/`; never hard-coded).

## Goal

1. A shared **`authoring-build-core`** section module (flat id) holds the common build discipline: self-contained context (project-read not strictly banned; needing it = a bug), never-install guard, scope-lock (create + update custom things), small-adjustment-via-direct-invocation allowance, and follow-the-checklist-to-completion.
2. **No separate Fixer.** `authoring-fix` is removed; `authoring-implement/identity` is **dual-mode** — build (`implement-start/-end`) and fix (`fix-start/-end`, only flagged blockers, hand back to review) — and composes `authoring-build-core`.
3. The composer flow routes `fix-needed` (AI review **and** human review) back to the Implementer.
4. The Composer Taskmaster emits implementer subtasks as real markdown **checkboxes**.
5. The MCP-secrets guidance offers both the UI and the file path.
6. Authoring docs describe the final Implementer behavior (build + fix), the removed Fixer, and the shared core.

## Scope

### In scope

- `modules/roles/authoring.json` — add `authoring-build-core`; make `authoring-implement/identity` dual-mode; **remove** `authoring-fix/identity`; update reviewer + human-review identities ("hand back to the implementer"); update the analyst MCP-pass secrets note.
- `composed/authoring.json` — add `authoring-build-core` to `authoring-implement`; **delete** the `authoring-fix` agent; add `authoring-human-review/handover-fix` to the human-review agent; update the implementer description.
- `project/authoring.json` — remove `authoring-fix` from `agents`; reroute `fix-needed` (review + human-review) to `authoring-implement`; add the `implement --fixed--> review` edge; update the flow description.
- `modules/handovers-authoring.json` — retarget `authoring-review/handover-fix` to the implementer; add `authoring-human-review/handover-fix`; remove `authoring-fix/handover-review`; broaden `authoring-implement/handover-review`.
- `modules/authoring-spec-structure.json` — implementer subtasks as a `- [ ]` checkbox list.
- `composer-conventions.ts` (`COMPOSER_RULES`) — MCP-secrets both-ways wording.
- `website/docs/authoring/agents-and-subagents.md` + `walkthrough.md` — 7 agents, Fixer dropped, Implementer builds+fixes, secrets both-ways.
- `packages/taskflow/test/compose.test.mjs` — authoring agent-count floor `>= 8` → `>= 7`.

### Out of scope

- Base-product roles at repo root (`TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`) and `templates/roles/` — the normal task flow. Do NOT touch.
- The composer MCP server (`mcp/composer.ts`) and the author subagents' internals.
- Reconciling already-installed composer flows in consumer projects (a re-install/uninstall handles the stale `task-authoring-fix` artifact).

## Implementation plan (as shipped)

1. **Shared core.** Add `authoring-build-core` (flat id, `kind: section`) with: project-read not strictly forbidden / needing-it-is-a-bug; author via composer stdio MCP only; never install; scope-lock (create + update the custom things); small change = user can call the implementer directly without the taskmaster; follow the checklist to every box ticked.
2. **Implementer = dual-mode.** Rewrite `authoring-implement/identity`: build mode (`implement-start/-end`, work the checklist) and fix mode (`fix-start/-end`, only review-flagged blockers, hand back to review). Compose `authoring-build-core`.
3. **Remove the Fixer.** Delete `authoring-fix` from the flow `agents`, `composed/authoring.json`, `authoring-fix/identity`, and `authoring-fix/handover-review`.
4. **Reroute `fix-needed`.** Flow edges: `authoring-review --fix-needed--> authoring-implement`, `authoring-human-review --fix-needed--> authoring-implement`, `authoring-implement --fixed--> authoring-review` (plus the existing `--implemented-->`). Retarget/adjust the matching handover modules; update reviewer + human-review identities.
5. **Taskmaster checkboxes.** `authoring-spec-structure.json` — implementer subtasks as `- [ ]` written into `CHECKLIST.md`.
6. **Secrets both-ways.** `COMPOSER_RULES` + analyst MCP-pass note — dashboard install UI or hand-edit `secrets.local.json`.
7. **Docs + test.** Update the two authoring docs (7 agents, build+fix implementer, secrets); update the compose-test agent-count floor.

## Verification (all passed)

- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 / 321** ✅.
- `composer-authoring` loads via the real loader: **7 agents, 11 edges, no dangling endpoints**, valid path to `done`; `fix-needed` edges both target `authoring-implement`; implement edges `implemented→review` + `fixed→review`.
- All 7 authoring agents compose and carry `plain-language`. No `authoring-fix` / `task-authoring-fix` left in `src` or docs.
- Rendered `authoring-implement` shows build + fix modes and the final wording; `authoring-analyze` shows the secrets "either way" wording.

## Notes

- Builds on **N200** (composer analyze v2) and **N201** (composer taskmaster v2), merged into `agents-approved`.
- The shared core is a composable **module** (flat id, like `security` / `template-copy`).
- This task edits built-in role/module/flow JSON + conventions + docs; it does not itself run the composer flow.

## Design evolution (history)

The original plan (round 1) kept a **separate Composer Fixer** and put a shared `authoring-build/core` module (slash id) on both the Implementer and the Fixer. Through human review this changed to the design above:

- **Round 1 (AI):** flat-id fix — `authoring-build/core` → `authoring-build-core` (slash ids are role-private; a shared module must be flat).
- **Round 2 (human):** remove the Fixer; the Implementer builds *and* fixes; route `fix-needed` (AI + human) to it.
- **Round 3 (human):** reword the core — project-read not strictly forbidden; job = "create and update the custom things"; "small adjustments" = call the implementer directly without the taskmaster.
- **Round 4 (human):** MCP-secrets guidance offers both the dashboard install UI and the hand-edited file.
- **Round 5 (AI):** approved.
