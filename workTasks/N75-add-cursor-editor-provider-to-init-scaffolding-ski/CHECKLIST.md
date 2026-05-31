# N75 — Add Cursor editor provider to init scaffolding (skills + rules) via a provider seam — Checklist

## Done criteria

- [ ] `EditorProvider` interface + registry/selector exist under `packages/taskflow/src/init/providers/`.
- [ ] Canonical skill/role bodies live in one shared source (no per-provider duplication).
- [ ] `claude` provider output is byte-identical to the pre-refactor init (snapshot/regression test).
- [ ] `cursor` provider writes `.cursor/skills/<name>/SKILL.md` for every role — valid YAML frontmatter (`name`/`description`), body free of `$ARGUMENTS`.
- [ ] `cursor` provider writes a Cursor rules file carrying the insight-flow context section.
- [ ] `insight-flow init --editor claude|cursor|all` works; bare `init` auto-detects by `.claude/`/`.cursor/` presence.
- [ ] CLI engine + hooks untouched; hooks port explicitly deferred to a Phase-2 task.
- [ ] README + CLAUDE.md document `--editor` and the Cursor layout.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (TS strict)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm --dir packages/taskflow test` passes (init integration suite)
- [ ] New cursor-provider tests added and passing; no regression in Claude scaffolding

## Verification

- [ ] `insight-flow init --editor cursor` (temp dir) → `.cursor/skills/*/SKILL.md` + rules file, no `.claude/` writes
- [ ] `insight-flow init --editor claude` → byte-identical to pre-refactor output
- [ ] `insight-flow init --editor all` → both `.claude/` and `.cursor/` trees present
- [ ] Bare `insight-flow init` with only `.cursor/` present auto-selects cursor
