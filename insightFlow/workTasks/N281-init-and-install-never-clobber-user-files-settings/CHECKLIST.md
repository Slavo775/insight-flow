# N281 — Init and install never clobber user files — settings parse stop, cursor hooks merge, opt-outs, unmanaged conflicts — Checklist

## Done criteria

- [ ] One strict JSON reader: missing file → `{}`, malformed → error naming the file; used by all three hook installers and `emit` (A43)
- [ ] No code path writes a config file it failed to parse (A43)
- [ ] `.cursor/hooks.json` is merged per event; `--force` replaces only insight-flow entries (A44)
- [ ] Init persists every activity and lifecycle-hook answer, does not write `enabled: true` before asking, and re-init / `--yes` respect stored answers (A45)
- [ ] Install raises `InstallConflict` for unmanaged, differing same-name commands, skills and subagents; uninstall deletes only unchanged owned files (A47)
- [ ] All conflict checks run before the first write; the manifest is saved last; a mid-way failure rolls back (A47)
- [ ] `removeOwnedHook` removes only the owned entry inside a matcher group (A47)
- [ ] Built-in overrides and `custom:` definitions can no longer map to the same file; existing files migrated (A48)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`emit`, `install-targets`, `init`, `cursor-hooks`, `activity-hook`, `custom-defs-api`, `user-registry` green)

## Verification

- [ ] Tests: malformed settings untouched, cursor hooks merge, opt-out persistence, unmanaged-command conflict, rollback without orphans, user hook survives uninstall, built-in vs custom both survive
- [ ] Manual: trailing comma in `settings.local.json` → `init` stops, file byte-identical
