# N35 — Shared Claude status badge with three-state logic

**Type:** feat
**Priority:** high
**Created:** 2026-05-25

## Problem

- The current `activity-status` badge in the Claude Activity tab button only has two states (`active` / `idle`) and is wired only to the local `updateActivityStatus()` function inside `dashboard.ts`. There is no `permission-needed` state, and the logic is not reusable — the master overview page and any future panel cannot consume the same status.
- The badge state is derived ad-hoc inside the WebSocket event handler rather than from a single authoritative function driven by the event stream.

## Goal

1. Three badge states: `active` (Claude is working), `idle` (agent sent `agent-idle` event), `permission-needed` (hook sent `approval-required` event).
2. A single shared `claudeStatusFromEvent(ev)` function determines the new state from any incoming event; all consumers (dashboard tab badge, future overview badge) call it.
3. State transitions:
   - `start` event → `active`
   - `approval-required` hook event → `permission-needed`
   - `agent-idle` hook event → `idle`
   - `done` event → `idle`
4. The badge UI updates in `dashboard.ts` and is wired the same way in `packages/taskflow/src/server/overview.ts` (or wherever the overview page renders).

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — replace current `updateActivityStatus()` call sites with event-driven `claudeStatusFromEvent(ev)`; add `permission-needed` CSS state; update `switchActTab()` badge rendering.
- `packages/taskflow/src/server/overview.ts` (if exists) or equivalent overview page — add same badge with same CSS and same state function.
- CSS: add `.activity-status.permission-needed` rule alongside `.active` and `.idle`.

### Out of scope

- Sound effects (N36) and title changes (N37) — those consume the same state but are separate tasks.
- Persisting the status across page reloads (session storage, etc.) — out of scope for now.
- The hook scripts themselves — they already emit the correct event types.

## Implementation plan

1. **Add `permission-needed` CSS** — in the CSS const in `dashboard.ts`:
   ```css
   .activity-status.permission-needed { background: #3b1a00; color: var(--yellow); }
   ```

2. **Refactor `updateActivityStatus()`** — change signature to accept the three canonical states:
   ```js
   function updateActivityStatus(state) {
     var el = document.getElementById('activity-status');
     if (!el) return;
     var labels = { active: 'active', idle: 'idle', 'permission-needed': '🚨 permission' };
     el.textContent = labels[state] || '';
     el.className = 'activity-status' + (state ? ' ' + state : '');
   }
   ```

3. **Add `claudeStatusFromEvent(ev)` helper** — in the base script (available to all pages):
   ```js
   function claudeStatusFromEvent(ev) {
     if (ev.tool === 'Event' && ev.action === 'start') return 'active';
     if (ev.tool === 'Event' && ev.action === 'done') return 'idle';
     if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'approval-required') return 'permission-needed';
     if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'agent-idle') return 'idle';
     return null; // no state change for this event
   }
   ```

4. **Wire into event handler** — in `handleIncomingEvent(ev)` (or wherever the WS event is processed), replace the current ad-hoc `if (ev.action === 'done') updateActivityStatus('idle'); else updateActivityStatus('active')` with:
   ```js
   var newStatus = claudeStatusFromEvent(ev);
   if (newStatus) updateActivityStatus(newStatus);
   ```

5. **Wire into overview page** — if `overview.ts` / the overview dashboard exists, add the same `claudeStatusFromEvent` logic and `updateActivityStatus` call in its WS handler. Share the helper by placing it in a common inline script section.

6. **Build and verify** — `pnpm --dir packages/taskflow run build` exits 0.

## Verification

- `pnpm play` → Claude Activity tab button shows "idle" on load.
- Trigger a `start` event (`insight-flow log-event start`) → badge changes to "active".
- Trigger an `approval-required` hook event → badge shows "🚨 permission" with amber colour.
- Trigger `agent-idle` or `done` → badge returns to "idle".
- Badge renders the same way on the overview page.

## Notes

- `claudeStatusFromEvent` returns `null` for events that do not change state (tool calls, file edits, etc.) — callers must check for null before calling `updateActivityStatus`.
- Depends on N33 (event IDs) for reliable dedup so permission-needed doesn't fire twice on WS reconnect.
- N36 (sound) and N37 (title) will consume `claudeStatusFromEvent` directly — keep the function in the base script.
- Part of the **claude-status-module** group (N33–N37).
