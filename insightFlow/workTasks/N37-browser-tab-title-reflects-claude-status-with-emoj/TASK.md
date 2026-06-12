# N37 — Browser tab title reflects Claude status with emoji

**Type:** feat
**Priority:** medium
**Created:** 2026-05-25

## Problem

- The browser tab always shows "Taskflow Dashboard" regardless of Claude's current state. When the user is working in another tab they have no glanceable indicator of whether Claude is active, idle, or waiting for permission.

## Goal

1. The browser tab title updates in real time to reflect the current Claude status:
   - `active` → `⚡ Taskflow Dashboard` (lightning — Claude is running)
   - `idle` → `💤 Taskflow Dashboard` (sleeping — Claude finished)
   - `permission-needed` → `🚨 Taskflow Dashboard` (siren — needs approval)
   - Default / unknown → `Taskflow Dashboard` (no emoji, clean initial state)
2. Title updates are driven by `claudeStatusFromEvent(ev)` (N35) — no separate state tracking needed.
3. Title reverts to the plain title when activity is reset or the page reloads.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — add `updatePageTitle(state)` function; call it from the event handler alongside `updateActivityStatus()`.

### Out of scope

- Overview page title changes (can follow in a later task).
- Persisting title state across reloads.
- Favicon changes.

## Implementation plan

1. **Add `updatePageTitle(state)` function** in `getScript()`:
   ```js
   function updatePageTitle(state) {
     var base = 'Taskflow Dashboard';
     var prefix = { active: '⚡', idle: '💤', 'permission-needed': '🚨' };
     document.title = state && prefix[state] ? prefix[state] + ' ' + base : base;
   }
   ```

2. **Wire into event handler** — after the `claudeStatusFromEvent` call (N35), alongside `updateActivityStatus`:
   ```js
   var newStatus = claudeStatusFromEvent(ev);
   if (newStatus) {
     updateActivityStatus(newStatus);
     updatePageTitle(newStatus);
     playStatusSound(newStatus); // N36
   }
   ```

3. **Reset title on load** — `updatePageTitle(null)` called once during init so the title starts clean (no stale emoji from a previous session's tab).

4. **Build and verify** — `pnpm --dir packages/taskflow run build` exits 0.

## Verification

- `pnpm play` → tab title shows "Taskflow Dashboard" (no emoji) on load.
- `insight-flow log-event start` → tab title changes to "⚡ Taskflow Dashboard".
- `insight-flow log-event done` → tab title changes to "💤 Taskflow Dashboard".
- Simulate `approval-required` hook event → tab title changes to "🚨 Taskflow Dashboard".
- Page reload → title returns to plain "Taskflow Dashboard".

## Notes

- Emoji choices: ⚡ active (energy/fast), 💤 idle (asleep/done), 🚨 permission-needed (police siren — "hukačka").
- `document.title` is safe to set at any time; no side effects.
- Depends on N35 (`claudeStatusFromEvent`) — implement after N35 is merged.
- Part of the **claude-status-module** group (N33–N37).
