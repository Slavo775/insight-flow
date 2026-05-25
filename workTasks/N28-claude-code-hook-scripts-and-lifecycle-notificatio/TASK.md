# N28 — Claude Code hook scripts and lifecycle notification wiring

**Type:** feat
**Priority:** high
**Created:** 2026-05-25

**Modified:** 2026-05-25

## Problem

N27 defined the full hook-sourced event schema and `log-event --source hook` infrastructure, but no Claude Code hook scripts exist yet. Every `ClaudeHookEventType` event is currently dead — nothing calls them. The hooks that exist (`taskflow-activity.sh`, `taskflow-skill.sh`, `taskflow-done.sh`, `taskflow-classify.sh`) write to the activity log only and know nothing about the N27 typed event system. Until real hook scripts are wired into `.claude/settings.json`, insight-flow has no automated event stream.

## Goal

1. **Hook scripts** for the six highest-value Claude Code hooks: `SessionStart`, `UserPromptSubmit` (activation + `agent-active`), `Stop` (`agent-idle`), `PreToolUse` (`tool-requested`), `PostToolUse` (`tool-approved` / `file-written` / `file-edited`), `PermissionRequest` (`approval-required` + terminal bell).
2. **`install-lifecycle-hooks` CLI command** that generates and registers all scripts in `.claude/hooks/` and `.claude/settings.json` — idempotent, safe to re-run.
3. **Activation scoping** wired in: `UserPromptSubmit` hook detects insight-flow skill names and sets `~/.insight-flow/session-<id>.active`; all other hooks pass `--if-active` so they no-op outside insight-flow sessions.
4. **Notification outputs** for urgent events: `PermissionRequest` emits a terminal bell (`printf '\a'`) and macOS alert via `osascript`; `Stop` sends an "Agent idle" OS notification.
5. **`insight-flow init` calls `install-lifecycle-hooks`** automatically so every new project gets the full hook set from day one.

## Scope

### In scope

- `packages/taskflow/templates/hooks/` — new directory, 6 hook script templates (`.sh.tpl` or inline string constants):
  - `lifecycle-session-start.sh` — `SessionStart` → `log-event session-start`
  - `lifecycle-agent-active.sh` — `UserPromptSubmit` → activation flag + `log-event agent-active` (insight-flow skills only)
  - `lifecycle-agent-idle.sh` — `Stop` → `log-event agent-idle --if-active` + OS notification
  - `lifecycle-pre-tool.sh` — `PreToolUse` → `log-event tool-requested --if-active`
  - `lifecycle-post-tool.sh` — `PostToolUse` → `log-event tool-approved / file-written / file-edited --if-active`
  - `lifecycle-permission.sh` — `PermissionRequest` → `log-event approval-required --if-active` + `printf '\a'` + `osascript` alert
- `packages/taskflow/src/commands/install-lifecycle-hooks.ts` — new command; writes scripts, updates settings.
- `packages/taskflow/src/activity-hook.ts` — expose a new `installLifecycleHooks(cwd)` function (alongside existing `installActivityHook`).
- `packages/taskflow/src/cli.ts` — register `install-lifecycle-hooks` subcommand.
- `packages/taskflow/src/commands/init.ts` — call `installLifecycleHooks` as part of `insight-flow init`.
- `packages/taskflow/scripts/sync-role-templates.mjs` — no changes needed (hooks are not role files).

### Out of scope

- `PermissionDenied`, `StopFailure`, `SubagentStart/Stop`, `PostCompact`, `ConfigChange`, `Notification`, `PostToolBatch` hooks (lower priority, N29+).
- Hook uninstall / rollback command.
- Cross-platform notification beyond macOS `osascript` (fail silently on other platforms).
- Any changes to N26/N27 schema, types, or `log-event` logic.
- Wiring the N26 mandatory agent events (`start`, `done`) — those remain manually called by agents.

## Implementation plan

1. **Write hook script constants** (`packages/taskflow/src/activity-hook.ts`)
   - Add `LIFECYCLE_SESSION_START_SCRIPT`, `LIFECYCLE_AGENT_ACTIVE_SCRIPT`, etc. as template string constants alongside existing `SKILL_HOOK_SCRIPT` etc.
   - Each script: `#!/bin/bash`, reads `INPUT=$(cat)`, extracts `SESSION_ID` via `grep -o '"session_id":"[^"]*"'` pattern, then calls `insight-flow log-event <type> --source hook --hook-name <HookName> --session-id "$SESSION_ID" [--if-active] [--data "$DATA"]`.
   - `lifecycle-agent-active.sh` checks prompt against insight-flow skill patterns with a `case` statement before calling `log-event` (no `--if-active` — it sets the flag).
   - `lifecycle-session-start.sh` — no `--if-active` (session-start fires for all sessions, initialises the session JSONL).
   - `lifecycle-permission.sh` — after `log-event`, `printf '\a'`; if `command -v osascript >/dev/null 2>&1`, runs `osascript -e 'display notification "Approval required" with title "insight-flow"'` (fail silently).
   - `lifecycle-agent-idle.sh` — after `log-event`, same `osascript` pattern for "Agent idle" notification.

2. **`installLifecycleHooks(cwd, insightFlowBin?)` function** (`packages/taskflow/src/activity-hook.ts`)
   - Mirror structure of existing `installEnrichmentHooks`.
   - `insightFlowBin` defaults to `"insight-flow"` (PATH-resolved); allows override for tests.
   - Renders each script (substitute `__INSIGHT_FLOW_BIN__` placeholder), writes to `.claude/hooks/` with mode `0o755`.
   - Idempotent: skip if file already exists.
   - Returns `InstallLifecycleHooksResult { hooksWritten: number; settingsUpdated: boolean }`.

3. **Register hooks in `settings.json`** (inside `installLifecycleHooks`)
   - Target: `.claude/settings.json` (project-level, checked in) rather than `settings.local.json` (lifecycle hooks are project infrastructure, not personal).
   - Hook registration shape in settings:
     ```json
     {
       "hooks": {
         "SessionStart":       [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-session-start.sh" }] }],
         "UserPromptSubmit":   [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-agent-active.sh" }] }],
         "Stop":               [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-agent-idle.sh" }] }],
         "PreToolUse":         [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-pre-tool.sh" }] }],
         "PostToolUse":        [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-post-tool.sh" }] }],
         "PermissionRequest":  [{ "hooks": [{ "type": "command", "command": ".claude/hooks/lifecycle-permission.sh" }] }]
       }
     }
     ```
   - Merge with existing settings rather than overwrite — preserve any unrelated hooks already registered.
   - If a hook type already has an entry with the same command path, skip (idempotent).

4. **`install-lifecycle-hooks` subcommand** (`packages/taskflow/src/commands/install-lifecycle-hooks.ts`)
   - Thin wrapper: call `installLifecycleHooks(process.cwd())`, print result JSON.
   - Accept optional `--bin <path>` flag for non-PATH insight-flow installs.
   - Exit 0 with informational message if already installed.

5. **Wire into `insight-flow init`** (`packages/taskflow/src/commands/init.ts` or wherever `installEnrichmentHooks` is called)
   - After `installEnrichmentHooks(...)`, call `installLifecycleHooks(cwd)`.
   - Print "Generated 6 lifecycle hook(s) ... restart your Claude Code session to activate." message.

6. **`packages/taskflow/src/cli.ts`** — add `else if (command === "install-lifecycle-hooks")` branch.

7. **Build + smoke test**
   - `pnpm --dir packages/taskflow run build` passes.
   - Manual: `insight-flow install-lifecycle-hooks` in playground → 6 `.sh` files written, `settings.json` updated.
   - Restart Claude Code session, invoke `/task-implement` → `~/.insight-flow/session-<id>.active` file created within 1s.

## Verification

```bash
# 1. Install lifecycle hooks in playground
cd playground && insight-flow install-lifecycle-hooks
# → 6 hooks written, settings.json updated

# 2. Check settings.json has all 6 hook registrations
cat playground/.claude/settings.json | grep -c lifecycle
# → 6

# 3. Idempotent second run
insight-flow install-lifecycle-hooks
# → hooksWritten: 0, settingsUpdated: false

# 4. Start Claude Code session, run /task-implement N28
# After skill starts:
ls ~/.insight-flow/session-*.active
# → file exists

# 5. After session ends (Stop hook):
ls ~/.insight-flow/session-*.active
# → no file (cleared)
# OS notification "Agent idle" shown on macOS

# 6. Open http://localhost:6006 after firing approval-required event:
insight-flow log-event approval-required --source hook --hook-name PermissionRequest --task N28 --if-active
# → no-op (no active flag, plain session)
# Verify: activity feed shows nothing new

# 7. pnpm build passes
pnpm --dir packages/taskflow run build
```

## Notes

- **`settings.json` vs `settings.local.json`**: lifecycle hooks are project infrastructure (should be committed); the existing activity hook goes to `settings.local.json` (personal). Do not change the existing activity hook target.
- **Insight-flow skill names** that trigger activation in `lifecycle-agent-active.sh`:
  `task-implement | task-review | task-review-fix | task-human-review | taskmaster | taskmaster-change | task-git | task-incident | task-request-changes | complete-task`
- **`CLAUDE_SESSION_ID` env var**: Claude Code sets this in hook subprocesses automatically. Use it as `SESSION_ID="${CLAUDE_SESSION_ID:-}"` with the grep fallback for resilience.
- **`osascript` availability**: wrap in `command -v osascript >/dev/null 2>&1 &&` guard — fail silently on Linux/Windows.
- **Binary path**: hook scripts call `insight-flow` by name assuming it's on PATH. For local dev (playground), the dist binary is at `../../packages/taskflow/dist/cli.js`. The `--bin` flag allows override.
- **Pre-existing hooks**: `taskflow-skill.sh` (UserPromptSubmit) and `taskflow-done.sh` (Stop) already handle skill tracking. Lifecycle hooks are additive — they coexist in the same hook event type as separate entries.
- Related: N27 (schema + `log-event --source hook` + `--if-active` flag), N26 (event foundation).
- Next task (N29): add `task-done` OS notification triggered by `log-event done` (agent tier); consolidate and deduplicate overlapping skill/lifecycle hooks.
