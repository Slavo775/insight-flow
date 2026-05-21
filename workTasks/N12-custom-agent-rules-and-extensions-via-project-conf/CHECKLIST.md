# N12 — Custom agent rules and extensions via project config — Checklist

## Done criteria
- [ ] `taskflow.config.json` schema defined and documented (`packages/taskflow/schemas/taskflow.config.schema.json`)
- [ ] `insight-flow init` reads `taskflow.config.json` from `process.cwd()` when present
- [ ] `agents.extend` rules are appended to the relevant built-in role file under `## Project Extensions`
- [ ] Re-running `init` replaces (not duplicates) the `## Project Extensions` section
- [ ] `agents.custom` entries produce `.claude/skills/<name>.md` skill files
- [ ] Custom agent skill files include `@AGENT_ENFORCEMENT.md` reference
- [ ] Custom agents are listed in CLAUDE.md skills section
- [ ] `insight-flow init` with no config produces no regression (no extra sections, no error)
- [ ] Test fixture `packages/taskflow/test/fixtures/taskflow.config.json` added
- [ ] Integration test passes for extend + custom agent generation
- [ ] `packages/taskflow/README.md` updated with `## Customizing agents` section and schema example

## Quality gates
- [ ] `npx tsc --noEmit` passes in `packages/taskflow/`
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification
- [ ] Run `insight-flow init` with a config containing `agents.extend.task-implement: ["Only use pnpm, never npm"]` → `TASK_IMPLEMENTER_ROLE.md` contains the rule under `## Project Extensions`
- [ ] Run `insight-flow init` twice → section appears exactly once (idempotent)
- [ ] Run `insight-flow init` with `agents.custom: [{name: "deploy-check", ...}]` → `.claude/skills/deploy-check.md` exists
- [ ] CLAUDE.md lists `- deploy-check: @deploy-check.md` in the skills list
- [ ] Run `insight-flow init` without `taskflow.config.json` → no `## Project Extensions` in any role file
