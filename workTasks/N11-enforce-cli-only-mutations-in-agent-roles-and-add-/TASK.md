# N11 — Enforce CLI-only mutations in agent roles and add gh + git permissions

**Type:** rework
**Priority:** high
**Created:** 2026-05-21

## Problem

Agent role files (TASK_*_ROLE.md, TASKMASTER_ROLE.md) do not explicitly prohibit direct file editing of task artifacts. An AI can bypass `insight-flow` and write tracker.json, TASK.md, or CHECKLIST.md directly — risking state divergence or silent data corruption. Additionally, `gh` permission coverage in settings is incomplete and inconsistently documented across roles. There is no user-configurable prompt builder to customize agent behavior per project preferences.

## Goal

1. Every agent role file contains a visible `STRICT ENFORCEMENT` block that bans direct file edits on task artifacts.
2. All task state mutations go through `insight-flow` CLI commands only — no exceptions.
3. `.claude/settings.local.json` has complete `gh *` wildcard coverage, replacing the narrower `gh pr *`.
4. A new `insight-flow prompt-build` command scaffolds role-file enforcement blocks based on user-defined config (gitTool, strictCLI, prStrategy, etc.).
5. A `taskflow.prompt.json` config schema is defined and documented.

## Scope

### In scope
- `TASKMASTER_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_IMPLEMENTER_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_REVIEWER_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_REVIEW_FIXER_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_HUMAN_REVIEW_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_INCIDENT_ROLE.md` — add `STRICT ENFORCEMENT` block
- `TASK_REQUEST_CHANGES_ROLE.md` — add `STRICT ENFORCEMENT` block
- `.claude/settings.local.json` — replace `Bash(gh pr *)` with `Bash(gh *)`
- `packages/taskflow/src/commands/prompt-build.ts` — new command
- `packages/taskflow/src/cli.ts` — register `prompt-build` command
- `packages/taskflow/schema/prompt-config.schema.json` — config schema
- `packages/taskflow/templates/taskflow.prompt.json` — default config template

### Out of scope
- CLAUDE.md (project-level docs; agent rules live in role files)
- Changing the insight-flow data model or existing commands
- Enforcement in TASKMASTER_CHANGE_ROLE.md or any non-tracked role files (verify they exist first)

## Implementation plan

1. **Read and audit all 7 role files**
   - Read each TASK_*_ROLE.md + TASKMASTER_ROLE.md
   - Identify where in each file the enforcement block fits best (after INPUT CONTRACT or at the top)

2. **Add `STRICT ENFORCEMENT` block to each role file**
   - Insert after the first `---` separator or at the top of rules
   - Block text (standardized across all roles):
     ```
     STRICT ENFORCEMENT — TASK FILE MUTATIONS
     - NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside workTasks/
     - ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)
     - Running the script is MANDATORY — there are no exceptions, even for "minor" field updates
     - Violation: direct file edit bypasses validation, ID sequencing, and audit trail
     ```

3. **Add git/gh tool rule to each role file**
   - Append to the enforcement block:
     ```
     GIT / GH TOOL RULE
     - Use ONLY the tool configured in `taskflow.prompt.json` → `gitTool`
     - Default: `gh` for PR creation; `git` for branch/commit/push
     - Never mix tools for the same operation
     ```

4. **Update `.claude/settings.local.json`**
   - Replace `"Bash(gh pr *)"` with `"Bash(gh *)"`
   - Ensures `gh issue`, `gh repo`, `gh run`, etc. are permitted without separate allowlist entries

5. **Define `taskflow.prompt.json` config schema**
   - File: `packages/taskflow/schema/prompt-config.schema.json`
   - Fields:
     - `gitTool`: `"gh" | "git"` — which tool agents use for PRs (default: `"gh"`)
     - `strictCLI`: `boolean` — whether to block direct file edits (default: `true`)
     - `prStrategy`: `"draft" | "ready"` — PR state on creation (default: `"ready"`)
     - `branchPrefix`: `string` — branch naming prefix (default: inferred from task type)
     - `requireChecklist`: `boolean` — agents must verify checklist before marking done (default: `true`)

6. **Create `insight-flow prompt-build` command**
   - File: `packages/taskflow/src/commands/prompt-build.ts`
   - Reads `taskflow.prompt.json` from cwd (or `--config` flag)
   - Outputs an enforcement block snippet to stdout (or `--apply` flag patches all role files in-place)
   - Usage: `insight-flow prompt-build` (preview) or `insight-flow prompt-build --apply` (patch role files)

7. **Register command in CLI**
   - `packages/taskflow/src/cli.ts` — add `prompt-build` subcommand

8. **Build and verify**
   - `pnpm --dir packages/taskflow run build:cli`
   - `node dist/cli.js prompt-build --help`

## Verification

```bash
# Confirm enforcement block appears in role files
grep -l "STRICT ENFORCEMENT" TASK_*_ROLE.md TASKMASTER_ROLE.md

# Confirm gh wildcard in settings
grep '"Bash(gh \*)"' .claude/settings.local.json

# Confirm prompt-build command
node packages/taskflow/dist/cli.js prompt-build --help
node packages/taskflow/dist/cli.js prompt-build  # should print enforcement block

# TypeScript compiles
pnpm --dir packages/taskflow run typecheck
```

## Notes

- Related: N08 (moved role definitions into taskflow package via init)
- The `prompt-build --apply` flag is the automated path; manual copy-paste from preview is the fallback
- `taskflow.prompt.json` should be committed to the repo so team members share the same agent config
- If `TASK_REQUEST_CHANGES_ROLE.md` or `TASKMASTER_CHANGE_ROLE.md` exist, they must also receive the enforcement block (audit in step 1)
