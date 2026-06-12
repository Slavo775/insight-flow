# N18 — Activity panel renders silently empty when activity hook is not installed

**Type:** fix
**Priority:** high
**Created:** 2026-05-22

## Problem

In any project where `insight-flow init` was never run (or where the user installed `insight-flow` globally and runs `insight-flow ui` in an arbitrary repo), the activity panel appears and stays empty forever. The server starts with `activityEngine.enabled !== false` (the default in `packages/taskflow/src/config.ts:22`), so `dashboard.ts` renders the panel — but the JSONL log at `.taskflow-activity.jsonl` is never written because the Claude Code PostToolUse hook (`.claude/hooks/taskflow-activity.sh`) does not exist. The user sees `Engine: Activity engine ON` in stdout, a panel that says "idle", and zero events forever, with no actionable signal about *why*.

## Goal

1. The activity panel never leaves the user guessing why it is empty.
2. A clear empty-state explains the missing hook and the exact command(s) to install it without re-running `insight-flow init` (preserve user config).
3. Detection happens server-side at startup and is pushed to the client over the initial WS `snapshot`.
4. Once the hook is installed and emits a first event, the empty-state disappears automatically.

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — detect, at startup, whether `.claude/hooks/taskflow-activity.sh` exists AND whether `.claude/settings.local.json` (or `.claude/settings.json`) registers a PostToolUse entry pointing at it. Surface result in the WS `snapshot.data` payload as a new field, e.g. `hookStatus: "ok" | "hook-missing" | "settings-missing" | "both-missing"`.
- `packages/taskflow/src/server/dashboard.ts` — when `hookStatus !== "ok"` and no events arrive, render an empty-state with copy + install command. When the first event arrives, hide the empty-state.
- `packages/taskflow/src/init/index.ts` — extract `generateActivityHook` into a re-runnable helper and expose a new CLI subcommand (e.g. `insight-flow install-activity-hook`) so users can retrofit existing projects without going through full init.
- README + role docs note: how to enable the activity panel after the fact.

### Out of scope

- Changing the hook script itself or its event schema.
- Migrating away from the JSONL transport.
- Auto-installing the hook silently — too invasive; we only *offer* the command.
- Watcher fixes (covered by N17).

## Implementation plan

1. **Detect hook + settings state at server startup**
   - In `startServer`, before constructing `ActivityEngine`, compute `hookStatus`:
     - `hook-missing`: `.claude/hooks/taskflow-activity.sh` does not exist.
     - `settings-missing`: hook file exists but no `.claude/settings*.json` entry references it.
     - `both-missing`: neither.
     - `ok`: both present.
   - Log `hookStatus` once at boot (after the "Engine: Activity engine ON" line).
2. **Ship the status to the client**
   - Extend the initial WS `snapshot` payload: `{ type: "snapshot", data: { activity: [...], hookStatus, configEnabled } }`.
   - Update WS senders in `server/index.ts` accordingly.
3. **Render the empty-state**
   - In `dashboard.ts`, store `hookStatus` and `configEnabled` from the snapshot.
   - When the activity panel is open AND `activityEvents.length === 0`, render an `.activity-empty-state` card with:
     - One-line problem statement appropriate to status.
     - The exact retrofit command: `insight-flow install-activity-hook`.
     - A "Learn more" link to README anchor.
   - When the first event arrives, remove the empty-state card (already handled by `renderActivityItem` removing `.activity-idle`).
4. **Add `install-activity-hook` subcommand**
   - New file `packages/taskflow/src/commands/install-activity-hook.ts` that reuses the extracted helper from step 1's refactor.
   - Register in `packages/taskflow/src/cli.ts`.
   - Idempotent: re-running is a no-op when both hook and settings entry exist (matches current `generateActivityHook` behaviour).
5. **Handle the "config explicitly disables engine" case**
   - When `config.activityEngine.enabled === false`, the panel isn't even rendered today (`dashboard.ts:4`). Keep that behaviour — but add a hint in the dashboard's top-bar (`Engine: off` chip) so the user knows it's off by config, not by accident.
6. **Docs**
   - Add an "Enabling the activity panel" section to `packages/taskflow/README.md` covering: (a) automatic via `insight-flow init`, (b) retrofit via `insight-flow install-activity-hook`, (c) what `enabled: false` in `taskflow.config.json` does.

## Verification

- Fresh repo, no `.claude/hooks/`: start `insight-flow ui` → activity panel shows the empty-state card with the retrofit command.
- Run `insight-flow install-activity-hook` → `.claude/hooks/taskflow-activity.sh` exists, `.claude/settings.local.json` has the PostToolUse entry, dashboard refresh shows no empty-state.
- Trigger any Claude Code tool call → first event lands; empty-state (if still showing) disappears.
- `taskflow.config.json` with `activityEngine.enabled: false`: panel not rendered, top-bar chip says "Engine: off (config)".
- `pnpm --dir packages/taskflow test` passes; new subcommand has a smoke test that runs it twice and asserts idempotency.

## Notes

- Related: N02 added the activity engine + hook generator. This task closes the UX gap for users who skipped init or are coming in from a global install.
- Related: N17 fixes live-updates so empty-state → populated transition is observable without manual reload.
- Future C (browser notifications) reads activity events; that task assumes this one has surfaced any "engine half-installed" state so the user is not silently missing transitions.
