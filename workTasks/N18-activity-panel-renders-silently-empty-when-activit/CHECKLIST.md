# N18 — Activity panel renders silently empty when activity hook is not installed — Checklist

## Done criteria

- [ ] Server computes `hookStatus` (`ok` / `hook-missing` / `settings-missing` / `both-missing`) at startup and logs it once.
- [ ] WS `snapshot` payload includes `hookStatus` and `configEnabled` fields.
- [ ] Dashboard renders an empty-state card in the activity panel when `hookStatus !== "ok"` and no events have arrived.
- [ ] Empty-state copy includes the exact retrofit command and disappears on first event.
- [ ] `insight-flow install-activity-hook` subcommand exists, is registered in the CLI, and is idempotent.
- [ ] `generateActivityHook` is refactored into a re-usable helper consumed by both `init` and the new subcommand.
- [ ] When `activityEngine.enabled: false` in config, dashboard shows an "Engine: off (config)" chip in the top-bar.
- [ ] README has an "Enabling the activity panel" section.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (existing + new smoke test for `install-activity-hook` idempotency)
- [ ] No regression in `insight-flow init` behaviour — running init still installs the hook end-to-end.

## Verification

- [ ] Manual: in a fresh repo without `.claude/hooks/`, start the UI and confirm the empty-state shows with the retrofit command.
- [ ] Manual: run `insight-flow install-activity-hook` → hook file + settings entry exist; refresh dashboard → no empty-state.
- [ ] Manual: trigger any Claude Code tool call → event appears in the panel.
- [ ] Manual: re-run `insight-flow install-activity-hook` → exits cleanly, makes no changes.
- [ ] Manual: set `activityEngine.enabled: false`, restart UI → panel not rendered, top-bar shows "Engine: off (config)".
