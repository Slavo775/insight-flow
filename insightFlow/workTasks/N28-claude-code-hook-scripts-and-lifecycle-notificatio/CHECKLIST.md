# N28 — Claude Code hook scripts and lifecycle notification wiring — Checklist

## Done criteria

- [ ] 6 lifecycle hook script constants defined in `packages/taskflow/src/activity-hook.ts` (`lifecycle-session-start`, `lifecycle-agent-active`, `lifecycle-agent-idle`, `lifecycle-pre-tool`, `lifecycle-post-tool`, `lifecycle-permission`)
- [ ] `installLifecycleHooks(cwd, insightFlowBin?)` function exported from `activity-hook.ts`; writes scripts to `.claude/hooks/` with mode `0o755`; idempotent
- [ ] Hook registrations merged into `.claude/settings.json` (not `settings.local.json`) for all 6 hooks (`SessionStart`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`)
- [ ] `lifecycle-agent-active.sh` detects insight-flow skill names via `case` statement and calls `log-event agent-active` (no `--if-active`); non-matching prompts exit 0 without calling log-event
- [ ] `lifecycle-permission.sh` calls `printf '\a'` (terminal bell) and `osascript` alert after logging; `osascript` call is guarded with `command -v` check
- [ ] `lifecycle-agent-idle.sh` sends `osascript` "Agent idle" notification after `log-event agent-idle --if-active`
- [ ] `install-lifecycle-hooks` CLI subcommand works; `--bin` flag accepted; prints result JSON
- [ ] `insight-flow init` calls `installLifecycleHooks` and prints hook count message
- [ ] `pnpm --dir packages/taskflow run build` passes (TypeScript strict)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (no regressions)
- [ ] No regressions: existing `install-activity-hook` and enrichment hooks unaffected
- [ ] No regressions: N26 agent events (`start`, `done`, etc.) still work
- [ ] No regressions: N27 `log-event --source hook --if-active` guard still works

## Verification

- [ ] `insight-flow install-lifecycle-hooks` in playground → 6 `.sh` files in `.claude/hooks/`, `.claude/settings.json` has 6 new hook entries
- [ ] Second run of `install-lifecycle-hooks` → `hooksWritten: 0, settingsUpdated: false` (idempotent)
- [ ] `cat playground/.claude/settings.json | grep -c lifecycle` → 6
- [ ] After `/task-implement` skill in Claude Code session: `ls ~/.insight-flow/session-*.active` → file exists
- [ ] After session Stop: active file removed; macOS shows "Agent idle" notification
- [ ] `insight-flow log-event approval-required --source hook --if-active --session-id nonexistent` → exits 0 silently (no-op outside active session)
