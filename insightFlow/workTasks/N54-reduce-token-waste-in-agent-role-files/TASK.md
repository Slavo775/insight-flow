# N54 — reduce token waste in agent role files

**Type:** rework
**Priority:** medium
**Created:** 2026-05-26

## Problem

Three categories of avoidable token waste exist across the agent role files. First, an identical 15-line EVENTS block is copy-pasted into all 8 role files — loaded in full on every agent run. Second, `AGENT_PROTOCOL.md` contains a `TOKEN EFFICIENCY` section that is word-for-word duplicated in `AGENT_ENFORCEMENT.md` (both loaded by every role). Third, `AGENT_PROTOCOL.md` contains a 15-line `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` block that explains the extension mechanism — meta-documentation the agent doesn't need at runtime.

## Goal

1. EVENTS block extracted to `AGENT_EVENTS.md`; all 8 role files reference it via `@AGENT_EVENTS.md` — one source of truth, ~120 lines of duplication eliminated.
2. `TOKEN EFFICIENCY` section removed from `AGENT_PROTOCOL.md` — `AGENT_ENFORCEMENT.md` remains the single owner.
3. `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` section in `AGENT_PROTOCOL.md` collapsed to one sentence — removes ~15 lines of explanatory meta-docs that add no runtime value.
4. GIT RULE static duplicate in `AGENT_PROTOCOL.md` removed — ownership moves to `AGENT_ENFORCEMENT.md` (made dynamic by N50; this task just removes the dead copy regardless of N50 order).
5. `sync-role-templates.mjs` updated so the new `AGENT_EVENTS.md` file is synced to `packages/taskflow/templates/roles/` on publish.

## Scope

### In scope

- `TASKMASTER_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md` — replace `<!-- taskflow:phase-markers:start/end -->` block with `@AGENT_EVENTS.md`.
- `AGENT_EVENTS.md` — new file at repo root containing the extracted EVENTS block.
- `AGENT_PROTOCOL.md` — remove `TOKEN EFFICIENCY` section, `GIT RULE` section, and `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` section; replace the last with one sentence: "Project-specific commands (typecheck, lint, test, PR-create) belong in `taskflow.config.json.agents.extend.<agent>` — see `CLAUDE.md` for examples."
- `packages/taskflow/scripts/sync-role-templates.mjs` — add `AGENT_EVENTS.md` to the sync list.
- `packages/taskflow/src/init/index.ts` — `stripPhaseMarkers` currently strips the inline block; update it to remove `@AGENT_EVENTS.md` reference instead when `activityEngine.phaseMarkers === false`.

### Out of scope

- `AGENT_ENFORCEMENT.md` content changes (GIT RULE made dynamic is N50's job).
- `TRACKER COMMAND CHEAT-SHEET` in AGENT_PROTOCOL.md — borderline, leave for now.
- Any role logic or behaviour changes.

## Implementation plan

1. **Create `AGENT_EVENTS.md`** — new file at repo root with the extracted EVENTS block content (copy from any role file, identical in all). Keep the `<!-- taskflow:phase-markers:start/end -->` markers around the content so `stripPhaseMarkers` can still strip it.

2. **Replace inline blocks in all 8 role files** — for each file, remove the `<!-- taskflow:phase-markers:start -->...<!-- taskflow:phase-markers:end -->` block and insert `@AGENT_EVENTS.md` in its place (same position, after the last role-specific section).

3. **Update `stripPhaseMarkers` in `init/index.ts`** — the function currently finds and removes the inline block from role files. Since the block is now in `AGENT_EVENTS.md`, `stripPhaseMarkers` should instead blank out `AGENT_EVENTS.md` itself (write empty string) when `phaseMarkers === false`, leaving the `@AGENT_EVENTS.md` reference in role files intact but pointing to an empty file.

4. **Trim `AGENT_PROTOCOL.md`** — remove three sections: `TOKEN EFFICIENCY`, `GIT RULE`, and `EXTENDING WITH PROJECT-SPECIFIC COMMANDS`. Replace the last with the one-sentence stub. Keep: STANDARD WORKFLOW, UNIVERSAL NEVER, TRACKER COMMAND CHEAT-SHEET, QUALITY BAR, the protocol/enforcement agreement note.

5. **Update `sync-role-templates.mjs`** — add `AGENT_EVENTS.md` to the array of files copied from repo root to `packages/taskflow/templates/roles/`.

6. **Verify `TASK_GIT_ROLE.md` exists** — it was missing from the repo root during audit. Confirm it exists in `.claude/roles/` (the consumer copy) and in `packages/taskflow/templates/roles/`. If missing from root, recreate from template.

## Verification

- Token count: `wc -w` on all role files before and after — total word count across all 8 + AGENT_PROTOCOL should be lower.
- `@AGENT_EVENTS.md` appears once in each role file, zero inline `<!-- taskflow:phase-markers -->` blocks remain in role files.
- `AGENT_PROTOCOL.md` no longer contains `GIT RULE`, `TOKEN EFFICIENCY`, or `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` headings.
- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.
- `pnpm --dir packages/taskflow run sync-role-templates` copies `AGENT_EVENTS.md` to `templates/roles/`.

## Notes

- GIT RULE removal from AGENT_PROTOCOL.md is safe to do now even before N50 — AGENT_ENFORCEMENT.md already has a static GIT RULE, so there's no gap. N50 makes it dynamic later.
- `TASK_GIT_ROLE.md` was absent from the repo root during this session's audit — file may exist only in `.claude/roles/`. Investigate in step 6.
- Related: N50 (prompt-build rework, makes GIT RULE in AGENT_ENFORCEMENT.md dynamic from config).
