# N24 — Fix hook registration format for Claude Code settings schema

**Type:** fix
**Priority:** high
**Created:** 2026-05-24

## Problem

Claude Code's settings schema was updated to require a `{ matcher, hooks: [{type, command, timeout}] }` structure for every hook entry. `insight-flow init` still writes the old flat format `{ command, timeout }` directly into `settings.local.json`. After a Claude Code session restart, the validator rejects every registered hook with "Expected array, but received undefined" — effectively disabling all activity, enrichment, and notification hooks in consumer projects.

## Goal

1. Fix `installActivityHook` so `PostToolUse` entries are written in the new `{ matcher, hooks }` format.
2. Fix `installEnrichmentHooks` so `UserPromptSubmit`, `Stop`, and `PreToolUse` entries are written in the new format.
3. Fix `installNotifyHook` so the second `Stop` entry is written in the new format.
4. Ensure the detection (`settingsRegistersHook` / `settingsRegistersHook` equivalents) still recognises both old and new formats so idempotent re-runs on existing installs do not double-register.
5. Ship as a patch release so consumer projects can fix by upgrading + re-running `insight-flow init`.

## Scope

### In scope

- `packages/taskflow/src/activity-hook.ts` — `installActivityHook` (line 130) and `installEnrichmentHooks` (line 253)
- `packages/taskflow/src/notify-hook.ts` — `installNotifyHook` (line 146)
- Detection functions in the same files — verify they already handle the new `hooks` array shape (they do; no change needed unless a gap is found)
- `packages/taskflow/src/init/index.ts` — no change needed; it delegates to the three install functions above

### Out of scope

- Migrating existing `settings.local.json` files in consumer projects (users re-run `insight-flow init`)
- Changing hook script contents (`.sh` files)
- Any other installer logic or CLI commands

## Implementation plan

1. **Fix `installActivityHook`** (`activity-hook.ts:129-131`)
   - Replace: `postToolUse.push({ command: ".claude/hooks/taskflow-activity.sh", timeout: 5000 })`
   - With: `postToolUse.push({ matcher: "", hooks: [{ type: "command", command: ".claude/hooks/taskflow-activity.sh", timeout: 5000 }] })`

2. **Fix `installEnrichmentHooks`** (`activity-hook.ts:252-255`)
   - The loop that pushes `{ command: hookCmd, timeout: 5000 }` for each of the three enrichment hooks
   - Replace with: `{ matcher: "", hooks: [{ type: "command", command: hookCmd, timeout: 5000 }] }`

3. **Fix `installNotifyHook`** (`notify-hook.ts:145-147`)
   - Replace: `stop.push({ command: ".claude/hooks/taskflow-notify.sh", timeout: 5000 })`
   - With: `stop.push({ matcher: "", hooks: [{ type: "command", command: ".claude/hooks/taskflow-notify.sh", timeout: 5000 }] })`

4. **Verify detection logic is format-agnostic** — all three `settingsRegistersHook`-style functions already check both `entry.command` (old) and `entry.hooks[].command` (new). Confirm with a read; fix any gap found.

5. **Build and test** — `pnpm --dir packages/taskflow run build`. Then run `insight-flow init` in the playground sandbox and inspect `.claude/settings.local.json` to confirm all five hook entries are in the new format.

6. **Bump patch version** — increment `packages/taskflow/package.json` patch version so consumer projects know to upgrade.

## Verification

- After running `insight-flow init` in any project, `.claude/settings.local.json` contains no bare `{ command, timeout }` hook entries — all are wrapped in `{ matcher, hooks: [{type, command, timeout}] }`.
- Claude Code no longer shows "Expected array, but received undefined" errors on restart.
- Re-running `insight-flow init` on a project that already has the new format is a no-op (no duplicate entries).
- `pnpm --dir packages/taskflow run build` passes.

## Notes

- Affected hook events: `PostToolUse` (activity), `UserPromptSubmit` (skill), `Stop` (done + notify), `PreToolUse` (classify) — five entries total across three installers.
- The consumer project `debugger-pro-plus-3000` already had its `settings.local.json` corrected to the new format manually. The fix here ensures future `init` runs produce the correct format from the start.
- Old-format entries already on disk in other consumer projects will be ignored by Claude Code's validator but NOT double-registered once the fix ships (detection is already format-agnostic).
- Related: N12 (agents.extend), N21 (activity feed) — neither is affected by this change.
