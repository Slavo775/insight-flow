# N54 — reduce token waste in agent role files — Checklist

## Done criteria

- [ ] `AGENT_EVENTS.md` created at repo root with extracted EVENTS block
- [ ] All 8 role files reference `@AGENT_EVENTS.md`; zero inline `<!-- taskflow:phase-markers -->` blocks remain in role files
- [ ] `stripPhaseMarkers` in `init/index.ts` blanks `AGENT_EVENTS.md` instead of patching 8 role files
- [ ] `AGENT_PROTOCOL.md` has no `GIT RULE`, `TOKEN EFFICIENCY`, or `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` sections
- [ ] `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` replaced by one-sentence stub
- [ ] `sync-role-templates.mjs` includes `AGENT_EVENTS.md`
- [ ] `TASK_GIT_ROLE.md` presence confirmed/restored at repo root and in templates

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] `pnpm --dir packages/taskflow run sync-role-templates` completes without error

## Verification

- [ ] `wc -w` total across all 8 role files + AGENT_PROTOCOL.md is lower than before
- [ ] Each role file contains exactly one `@AGENT_EVENTS.md` reference
- [ ] `insight-flow init` with `phaseMarkers: false` results in empty `AGENT_EVENTS.md` in consumer project
