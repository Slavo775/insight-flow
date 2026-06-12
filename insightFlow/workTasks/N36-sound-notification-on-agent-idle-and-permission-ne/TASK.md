# N36 — Sound notification on agent idle and permission needed

**Type:** feat
**Priority:** medium
**Created:** 2026-05-25

## Problem

- The dashboard only provides visual feedback when Claude finishes or needs permission. If the user is looking at another window they miss the state change entirely. A subtle audio cue on `agent-idle` and `approval-required` events provides awareness without requiring the user to watch the screen.

## Goal

1. A soft, non-intrusive sound plays when the Claude status transitions to `idle` (agent done).
2. A distinct, more urgent sound plays when the status transitions to `permission-needed` (approval required).
3. Sounds are generated via the Web Audio API — no external audio files needed, zero network requests.
4. Sound can be muted via the existing notifications settings popover (reuse the existing "Sound" checkbox: `#notif-sound`).
5. Sounds only fire once per unique event ID (N33), not on WS reconnect replays.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — add `playStatusSound(state)` function in `getScript()`; call it from the same event handler that calls `updateActivityStatus()` (N35).
- Reuse the existing `notif-sound` localStorage key already used by browser push notifications.

### Out of scope

- Loading audio files from disk or CDN.
- Sounds for other event types (tool calls, phase milestones, etc.).
- Mobile vibration API.

## Implementation plan

1. **Add `playStatusSound(state)` using Web Audio API**:
   ```js
   function playStatusSound(state) {
     if (localStorage.getItem('notif-sound') !== 'true') return;
     try {
       var ctx = new (window.AudioContext || window.webkitAudioContext)();
       var osc = ctx.createOscillator();
       var gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       if (state === 'idle') {
         // Soft two-tone descending chime: pleasant, signals completion
         osc.type = 'sine';
         osc.frequency.setValueAtTime(880, ctx.currentTime);
         osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
         gain.gain.setValueAtTime(0.15, ctx.currentTime);
         gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
         osc.start(ctx.currentTime);
         osc.stop(ctx.currentTime + 0.5);
       } else if (state === 'permission-needed') {
         // Short repeating pulse: attention-grabbing but not alarming
         osc.type = 'square';
         osc.frequency.setValueAtTime(660, ctx.currentTime);
         gain.gain.setValueAtTime(0.08, ctx.currentTime);
         gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
         gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.15);
         gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
         osc.start(ctx.currentTime);
         osc.stop(ctx.currentTime + 0.35);
       }
       ctx.close();
     } catch (e) { /* AudioContext unavailable (server-side render, test env) */ }
   }
   ```

2. **Wire into event handler** — immediately after `updateActivityStatus(newStatus)` (from N35):
   ```js
   if (newStatus === 'idle' || newStatus === 'permission-needed') {
     playStatusSound(newStatus);
   }
   ```

3. **Guard with event ID dedup** — sounds must not fire twice for the same event on WS reconnect. Use the `seenEventKeys` set (already populated by N33 event ID dedup) — by the time `playStatusSound` is called, duplicate events have already been rejected.

4. **Ensure `notif-sound` checkbox initialises** — in `loadNotifSettings()`, confirm `notif-sound` checkbox state is restored from localStorage on page load so the sound toggle persists across sessions (this should already work with the existing settings code).

5. **Build and verify** — `pnpm --dir packages/taskflow run build` exits 0.

## Verification

- `pnpm play` → open dashboard → check "Sound" in the notification settings popover.
- Run `insight-flow log-event done` (triggers `idle` state via N35) → hear a soft descending chime.
- Simulate `approval-required` hook event → hear two short pulses.
- Uncheck "Sound" → no audio on subsequent events.
- WS disconnect + reconnect → no double-sound on re-delivered events.

## Notes

- Web Audio API is available in all modern browsers. `ctx.close()` is called immediately after scheduling — the audio completes before the context closes (async scheduling).
- Using `localStorage.getItem('notif-sound') !== 'true'` matches the existing pattern used by `saveNotifSettings()` / `loadNotifSettings()` in `dashboard.ts`.
- Depends on N33 (event IDs for dedup) and N35 (`claudeStatusFromEvent` driving the state).
- Part of the **claude-status-module** group (N33–N37).
