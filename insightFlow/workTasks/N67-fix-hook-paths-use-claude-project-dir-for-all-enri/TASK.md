# N67 — fix hook paths: use CLAUDE_PROJECT_DIR for all enrichment hooks

**Type:** fix
**Priority:** high
**Created:** 2026-05-28

## Problem

All hook scripts registered by `installEnrichmentHooks()` and `installNotifyHook()` used bare relative paths (e.g. `.claude/hooks/taskflow-activity.sh`). Claude Code does NOT guarantee CWD equals the project root when firing hooks — affects `PostToolUse`, `PreToolUse`, and `Stop` in practice. Every tool call and session end produced `/bin/sh: .claude/hooks/<file>: No such file or directory` errors in the hook status bar.

The lifecycle hooks installer (`installLifecycleHooks`) already used `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>` correctly. The enrichment and notify hooks were never updated to match.

## Goal

1. `installEnrichmentHooks()` writes `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>` for all events.
2. `installNotifyHook()` writes `${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-notify.sh` for the Stop event.
3. Existing `settings.local.json` entries in this repo patched to remove stale relative paths.
4. `pnpm build` passes with no TypeScript errors.
5. Ships as v0.11.2 with CHANGELOG entry.

## Scope

### In scope

- `packages/taskflow/src/activity-hook.ts` — PostToolUse registration string + loop hookCmd string
- `packages/taskflow/src/notify-hook.ts` — Stop registration string
- `.claude/settings.local.json` (this repo) — four stale relative-path entries patched

### Out of scope

- Migration helper for consumer projects (re-running `insight-flow init` after upgrade rewrites `settings.local.json`)
- Changing `HOOK_REL_PATH` constant (used for path resolution only, not written to settings)

## Implementation plan

1. **`activity-hook.ts` — PostToolUse registration** (line ~130)
   - Change: `.claude/hooks/taskflow-activity.sh` → `${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-activity.sh`

2. **`activity-hook.ts` — enrichment loop hookCmd** (line ~247)
   - Change: `hookCmd = \`.claude/hooks/${file}\`` → `hookCmd = \`\${CLAUDE_PROJECT_DIR}/.claude/hooks/${file}\``

3. **`notify-hook.ts` — Stop registration** (line ~155)
   - Change: `.claude/hooks/taskflow-notify.sh` → `${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-notify.sh`

4. **`.claude/settings.local.json`** — replace all four occurrences of `".claude/hooks/<file>"` with `"${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>"`

5. **Bump version and CHANGELOG** — `package.json` `0.11.1` → `0.11.2`; add `## [0.11.2]` entry.

## Verification

```bash
pnpm build   # no errors
# restart Claude Code — hook error banners no longer appear
```

## Notes

- Consumer projects on ≤v0.11.1 should run `insight-flow init` after upgrading to v0.11.2 to rewrite their `settings.local.json`.
- Related: all previous versions since hooks were introduced had this bug.
