# N205 — Composer flow polish — review-template convention, status display names, hooks in install validation

**Type:** feat
**Priority:** medium
**Created:** 2026-07-09

## Problem

A `/task-analyze` audit of the composer (authoring) flow against the human's full requirements list left **three small residual gaps** after N200–N204 (all prompt/definition/title edits, no structure): (1) `COMPOSER_RULES` has a "taskmasters are templated" convention but **no equivalent for reviewers** (req: "same for review"); (2) the statuses `ready`/`approved` don't show the human's preferred labels "ready to implement" / "ready to install"; (3) the installer's post-install validation checks commands/agents/`.mcp.json` but **not hooks**, and phrases checks as "present" not "present and correct". See `ANALYSIS.md`.

## Goal

1. Custom **reviewers are templated by default** — a `COMPOSER_RULES` bullet stating a custom review agent writes `REVIEW.md` from insight-flow's shared template (parallel to the taskmaster rule), reaching all authoring agents.
2. Status **display titles**: `ready` → "ready to implement", `approved` → "ready to install" (**ids unchanged** — no CLI/flow risk).
3. Installer **post-install validation includes hooks** and requires artifacts **correct, not just present**.

## Scope

### In scope

- `packages/taskflow/src/agents/composer-conventions.ts` — `COMPOSER_RULES`: add the reviewers-templated bullet (next to "Taskmasters are templated by default").
- `packages/taskflow/src/agents/project/authoring.json` — set `title` on the `ready` and `approved` status objects (ids untouched).
- `packages/taskflow/src/agents/modules/roles/authoring.json` — `composer-install-checklist` (and, if it echoes the list, `authoring-install/identity`): add **hooks** to the validate step; phrase artifact checks as **present and correct** (agent `.md` created, hook installed & correct, command installed & correct, `.mcp.json` entries right).
- Docs (`website/docs/authoring/*`) — only if a page lists the validation artifacts or the status labels; keep in sync.
- `packages/taskflow/test/compose.test.mjs` — optional small assertion for the status titles / reviewers-templated text.

### Out of scope

- Renaming status **ids** (rejected — breaks the CLI verdict=status model; see ANALYSIS option C). Titles only.
- Any CLI change, flow-graph change, new agent/handover, or install-execution change.
- The base product flow (`task-*`).

## Implementation plan

1. **A — reviewers-templated convention.** In `COMPOSER_RULES` (`composer-conventions.ts`), add a bullet after "Taskmasters are templated by default": custom **reviewers** are templated too — a review agent writes/updates `REVIEW.md` scaffolded from insight-flow's shared review template (via `review-start`), so review records stay consistent across flows. Keep it consistent with `authoring-review/identity`'s existing "REVIEW.md from the template" wording (this generalises it to any custom reviewer).
2. **B — status titles.** In `project/authoring.json` statuses, set `{ "id": "ready", "title": "ready to implement", … }` and `{ "id": "approved", "title": "ready to install", … }`. Leave every other status and all ids unchanged.
3. **C — hooks in validation.** In `composer-install-checklist`, extend the "Validate the real install" step to include **hooks** alongside `.claude/commands/*`, `.claude/agents/*`, `.mcp.json` entries, and require each artifact is **installed and correct** (not merely present): the agent `.md` files were created, hooks were installed and are correct, commands were installed and are correct, `.mcp.json` entries resolve. Mirror the same phrasing in `authoring-install/identity` if it restates the list.
4. **Docs + test.** Update any authoring doc that enumerates the validation artifacts or the status labels; add a light test for the status titles and/or the reviewers-templated convention.

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` → all pass.
- Rendered authoring agents (e.g. `authoring-create`, `authoring-review`) include the "reviewers are templated" convention (via `composer-authoring-conventions`).
- `composer-authoring` statuses: `ready`.title === "ready to implement" and `approved`.title === "ready to install"; **ids still `ready`/`approved`** (loader; `create`/`review-end --verdict approved` unaffected).
- Rendered `authoring-install` validate step names hooks and says "installed and correct".
- No flow-graph / agent-count change (still 5 agents); no id renames.

## Notes

- Follow-up polish after the composer-v2 series (N200 analyze, N201 taskmaster, N202 implementer, N203 review, N204 install). Closes the three residual audit gaps.
- Status names use `title` deliberately (not `id`) so the CLI's verdict=status behaviour and the N203 `ai-approved` divert stay intact.
- This repo tracks its own tasks on `default`; the composer-authoring flow is a shipped built-in. Merge into `agents-approved`, like its siblings.
