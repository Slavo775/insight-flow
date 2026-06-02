# N78 — Rename batch→bulk CLI (deprecated aliases) + editor-aware init/bulk via config.editor — Checklist

## Done criteria

- [ ] `bulk-register` / `bulk-unregister` / `bulk-down` / `bulk-ui` (+ `--add`/`--remove`/`--list`) work as the canonical commands.
- [ ] Old `batch-ui` / `ui-batch-*` names still dispatch but print a one-line deprecation warning (stderr).
- [ ] `TaskflowConfig.editor` (`claude`/`cursor`/`all`) added to types + config schema (optional).
- [ ] `init` precedence: `--editor` flag → `config.editor` → auto-detect → claude (verified).
- [ ] `bulk-init` honors each project's `config.editor`; `bulk-init --editor <v>` overrides the fleet.
- [ ] Registry storage + `BatchUiEntry = {label, path}` unchanged; existing registrations still load.
- [ ] `printHelp` + README + CLAUDE.md updated (new names, aliases, `config.editor`).

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (TS strict)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new alias / precedence / passthrough tests)
- [ ] No regression in existing init / batch-ui behavior

## Verification

- [ ] `insight-flow batch-ui --list` → works + prints deprecation warning pointing to `bulk-ui`
- [ ] config `"editor": "cursor"` → bare `insight-flow init` scaffolds `.cursor/` (no flag); `--editor claude` overrides
- [ ] `bulk-init --editor all` → every registered project gets both `.claude/` + `.cursor/`
