# N275 — Consumer prompts carry the real roles — @-include built-in commands, Cursor include inlining, one name per agent — Checklist

## Done criteria

- [x] `init` writes every built-in command as `@.claude/roles/<ROLE>.md` + `$ARGUMENTS`; the `SKILL_*` constants are deleted (A16)
- [x] A fresh init writes the new @-include command; re-init never overwrites a same-named command whose content differs — it REPORTS it (the tested in-place-init contract), so a user edit is safe. NOTE: old stubs are reported, not silently auto-upgraded (auto-upgrade would require recognizing each old stub and conflicts with that contract); the user re-inits/deletes to adopt the new form (A16)
- [x] `toCursorBody` inlines included files; Cursor skills contain the security text (A17)
- [x] No composed prompt says both "No subagents" and "You can delegate"; root `*_ROLE.md` re-composed; templates re-synced (A19)
- [x] A custom agent has one command name from `deriveCommandName` (A49)
- [ ] DEFERRED to N281: a custom-flow *install* in a Cursor project emits `.cursor/skills/<name>/SKILL.md`. This lives in the emit/install machinery (emit.ts applyCommands), which N281 owns and reworks; doing it here would reach across layers (toCursorBody is in the init provider). The primary A49 bug — init vs install scaffolding two command names — IS fixed (deriveCommandName). (A49)
- [x] `agents.custom` bodies include the security / enforcement / protocol trio (A80)
- [x] A test asserts `templates/roles/*` are byte-identical to the root role files (A80)

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes
- [x] `pnpm --dir packages/taskflow test` passes
- [x] No regressions in affected area (`compose` drift guards, `init`, `cursor-provider`, `agent-command`, `emit`, `no-technology-tight` green)

## Verification

- [x] `init --yes` in a temp dir → `.claude/commands/task-implement.md` holds the `@`-include and `$ARGUMENTS`
- [x] A Cursor skill for `task-review` contains "PROMPT INJECTION"
- [ ] DEFERRED to N281: uninstalling a custom flow removes its `.cursor/skills/` entry (pairs with the deferred Cursor-install emit above)
