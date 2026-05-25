# N36 — Sound notification on agent idle and permission needed — Review

## AI Review — Round 1

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

`playStatusSound()` is structurally correct — right tones, right gate, right dedup. The single blocker is that browsers refuse to create a playing `AudioContext` without a prior user gesture, so the sound is silently dropped on every invocation unless the user has already interacted with the page.

### Checklist verification

- [x] `playStatusSound(state)` added using Web Audio API — ✅ lines 333–361
- [x] `idle` plays sine descend 880→440 Hz, 0.5 s — ✅ lines 341–348
- [x] `permission-needed` plays square pulses 660 Hz — ✅ lines 349–357
- [x] Gated on `localStorage.getItem('notif-sound') === 'true'` — ✅ line 334
- [x] Called from event handler after `updateActivityStatus` — ✅ `addActivityEvent` line 864
- [x] No double-sound on WS reconnect — ✅ guarded by N33 dedup

### Blockers

1. **`AudioContext` blocked by browser autoplay policy — sound never plays** — `dashboard.ts` line 336 creates `new AudioContext()` inside the event handler, which runs without a preceding user gesture. Chrome, Firefox, and Safari all suspend new contexts in this case, so `ctx.currentTime` stays 0 and scheduled nodes fire silently.
   _Fix: create a single shared `AudioContext` eagerly and resume it on the first user interaction (click, keydown) before scheduling nodes. Pattern:_
   ```js
   var _audioCtx = null;
   function getAudioCtx() {
     if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
     if (_audioCtx.state === 'suspended') _audioCtx.resume();
     return _audioCtx;
   }
   document.addEventListener('click', function() { getAudioCtx(); }, { once: false });
   ```
   _Then replace `var ctx = new (...)` in `playStatusSound` with `var ctx = getAudioCtx();` and remove the `ctx.close()` call._

### Non-blocking

- Volume levels (0.15 for idle, 0.08 for permission) are reasonable and unlikely to startle.

### Security & edge cases

- None.

### Notes

- This is the same issue flagged in human review R1. The fix is straightforward — the rest of the function is correct.
