# N24 — Fix hook registration format for Claude Code settings schema — Checklist

## Done criteria

- [ ] `installActivityHook` writes `{ matcher: "", hooks: [{type: "command", command: "...", timeout: 5000}] }` for `PostToolUse`.
- [ ] `installEnrichmentHooks` writes the same shape for `UserPromptSubmit`, `Stop` (done hook), and `PreToolUse`.
- [ ] `installNotifyHook` writes the same shape for `Stop` (notify hook).
- [ ] Detection functions still recognise both old and new format (no double-registration on re-run).
- [ ] Patch version bumped in `packages/taskflow/package.json`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes (if init integration tests cover hook writing).

## Verification

- [ ] Run `insight-flow init` in `playground/` — inspect `playground/.claude/settings.local.json` — every hook entry has `matcher` + `hooks` array, no bare `command` at top level.
- [ ] Re-run `insight-flow init` in `playground/` — no duplicate entries appear.
- [ ] Open Claude Code in the playground — confirm no "Expected array, but received undefined" errors on startup.
