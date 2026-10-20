# N275 — Consumer prompts carry the real roles — @-include built-in commands, Cursor include inlining, one name per agent — Checklist

## Done criteria

- [ ] `init` writes every built-in command as `@.claude/roles/<ROLE>.md` + `$ARGUMENTS`; the `SKILL_*` constants are deleted (A16)
- [ ] Re-init upgrades old stubs but never overwrites a user-edited command (A16)
- [ ] `toCursorBody` inlines included files; Cursor skills contain the security text (A17)
- [ ] No composed prompt says both "No subagents" and "You can delegate"; root `*_ROLE.md` re-composed; templates re-synced (A19)
- [ ] A custom agent has one command name from `deriveCommandName` (A49)
- [ ] A custom-flow install in a Cursor project emits `.cursor/skills/<name>/SKILL.md`, tracked in the manifest (A49)
- [ ] `agents.custom` bodies include the security / enforcement / protocol trio (A80)
- [ ] A test asserts `templates/roles/*` are byte-identical to the root role files (A80)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`compose` drift guards, `init`, `cursor-provider`, `agent-command`, `emit`, `no-technology-tight` green)

## Verification

- [ ] `init --yes` in a temp dir → `.claude/commands/task-implement.md` holds the `@`-include and `$ARGUMENTS`
- [ ] A Cursor skill for `task-review` contains "PROMPT INJECTION"
- [ ] Uninstalling a custom flow removes its `.cursor/skills/` entry
