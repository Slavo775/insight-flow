# N11 — Enforce CLI-only mutations in agent roles and add gh + git permissions — Checklist

## Done criteria

- [ ] `TASKMASTER_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_IMPLEMENTER_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_REVIEWER_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_REVIEW_FIXER_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_HUMAN_REVIEW_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_INCIDENT_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] `TASK_REQUEST_CHANGES_ROLE.md` contains `STRICT ENFORCEMENT — TASK FILE MUTATIONS` block
- [ ] All enforcement blocks include the `GIT / GH TOOL RULE` section
- [ ] `.claude/settings.local.json` has `"Bash(gh *)"` (not just `"Bash(gh pr *)"`)
- [ ] `packages/taskflow/schema/prompt-config.schema.json` created with all 5 fields defined
- [ ] `packages/taskflow/templates/taskflow.prompt.json` created with defaults
- [ ] `packages/taskflow/src/commands/prompt-build.ts` created
- [ ] `prompt-build` registered in `packages/taskflow/src/cli.ts`
- [ ] `insight-flow prompt-build` prints the enforcement block snippet based on config
- [ ] `insight-flow prompt-build --apply` patches all role files found in cwd

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run build:cli` succeeds
- [ ] No regressions in existing `insight-flow` commands (create, current, stats, etc.)

## Verification

- [ ] `grep -l "STRICT ENFORCEMENT" TASK_*_ROLE.md TASKMASTER_ROLE.md` returns all 7 files
- [ ] `grep '"Bash(gh \*)"' .claude/settings.local.json` returns a match
- [ ] `node packages/taskflow/dist/cli.js prompt-build --help` shows usage
- [ ] `node packages/taskflow/dist/cli.js prompt-build` outputs enforcement block to stdout
- [ ] `node packages/taskflow/dist/cli.js prompt-build --apply` modifies role files (verify with grep)
