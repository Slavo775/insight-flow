# N43 — Dashboard sounds replay on reconnect — snapshot replays playStatusSound for historical events

**Type:** fix
**Priority:** high
**Created:** 2026-05-26

## Problem

When the project dashboard tab is backgrounded and then brought back into focus, the socket.io connection reconnects and the server sends a `snapshot` event containing all recent activity events. The client handler (`dashboard.ts:756-775`) clears `seenEventKeys` and replays every event through `addActivityEvent`. That function calls `playStatusSound` for any event whose derived status is `idle` or `permission-needed` — so all historical idle/permission events in the snapshot batch play their audio at once. The user hears unexpected sounds whenever they switch back to the dashboard tab, even though no new agent event occurred.

## Goal

1. `playStatusSound` is never called during snapshot replay — only for live events arriving via the `activity` socket event.
2. Switching back to a backgrounded dashboard tab produces no spurious sounds.
3. Live `agent-idle` and `approval-required` events that arrive while the tab is focused still play their sounds correctly.
4. No regressions to the activity feed rendering or dedup logic.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — the `snapshot` and `activity` socket event handlers and the `addActivityEvent` / `playStatusSound` call chain.

### Out of scope

- Master overview (`packages/insight-flow-master/src/overview.ts`) — separate notification system, separate task if needed.
- No changes to the server-side snapshot emission or socket infrastructure.
- No changes to sound files or `playStatusSound` logic itself.

## Implementation plan

1. **Add an `isReplayingSnapshot` flag** in `getScript` near the top of the activity JS block (alongside `activityEvents`, `seenEventKeys`):
   ```js
   var isReplayingSnapshot = false;
   ```

2. **Set the flag around snapshot replay** in `sock.on('snapshot', ...)` (`dashboard.ts:756`):
   ```js
   sock.on('snapshot', function(data) {
     // ...existing hookStatus / configEnabled handling...
     if (data && data.activity && typeof addActivityEvent === 'function') {
       isReplayingSnapshot = true;       // ← set before loop
       activityEvents = [];
       if (typeof seenEventKeys !== 'undefined') seenEventKeys.clear();
       var feed = document.getElementById('activity-feed');
       if (feed) feed.innerHTML = '';
       for (var i = 0; i < data.activity.length; i++) {
         addActivityEvent(data.activity[i]);
       }
       isReplayingSnapshot = false;      // ← clear after loop
     }
     // ...rest unchanged...
   });
   ```

3. **Guard `playStatusSound` call in `addActivityEvent`** (`dashboard.ts:847`) — skip sound when replaying:
   ```js
   if (newStatus === 'idle' || newStatus === 'permission-needed') {
     if (!isReplayingSnapshot) playStatusSound(newStatus);
   }
   ```

4. **Build and verify** — `pnpm --dir packages/taskflow run build` must pass with no TS errors.

## Verification

- Open the project dashboard. Wait for it to load fully (activity feed populated).
- Switch to another tab for ~10 seconds, then switch back.
- **Expected**: no sounds play on return; feed is correctly re-populated.
- Trigger a real `agent-idle` event (end a Claude session) while the tab is focused.
- **Expected**: idle ping sound plays once.

## Notes

- `seenEventKeys` is intentionally cleared on snapshot so that the feed shows the server-authoritative history. The dedup exists to suppress UI duplicates, not to control sounds — those need a separate replay guard.
- The master overview (`overview.ts`) uses browser `Notification` API (not custom audio) and has a different trigger path; if that page also plays unexpected sounds it should be investigated separately.
- Related: N41 added the `claudeStatus` push mechanism which increased the frequency of `project-update` events on the master; that is a separate concern from this ticket.
