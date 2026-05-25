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


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **Replace Web Audio API synthesis with real MP3 files via `new Audio()`**
   The synthesised Web Audio tones are not the desired sounds. The project owner provides two MP3 files to use instead:
   - **Permission-needed alert**: `/Users/ssedlak/Downloads/universfield-new-notification-050-494248.mp3`
   - **Idle / done ping**: `/Users/ssedlak/Downloads/freesound_community-ping-82822.mp3`

   _Fix:_
   1. Copy both MP3s into the project (e.g. `packages/taskflow/src/server/sounds/`).
   2. Serve them as static assets from the dashboard server.
   3. Replace `playStatusSound()` to use `new Audio('/sounds/<file>.mp3').play()` instead of the Web Audio API oscillator code.
   4. Remove `getAudioCtx()` / `_audioCtx` shared-context plumbing — no longer needed.
   5. The `localStorage.getItem('notif-sound') === 'true'` gate must be kept.

### Suggestions (non-blocking)

- None.

### Notes

- Source files provided by the project owner; exact filenames to use after copying are at the implementer's discretion but should be kept descriptive.
- The `new Audio()` API does not require a user-gesture pre-warm like `AudioContext`, but browsers may still suppress it unless the page has had a prior interaction. Calling `.play()` in a `.catch(()=>{})` wrapper is sufficient.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **Sound gate reads wrong localStorage key — always blocked**
   "still i do not heard any sounds why?"
   `playStatusSound()` guards with `localStorage.getItem('notif-sound') !== 'true'` (standalone key). But `saveNotifSettings()` (line 631) writes sound preference inside a JSON blob under `'tf-notif-settings'` as `{sound: true, ...}` — the standalone `'notif-sound'` key is **never written**. So `localStorage.getItem('notif-sound')` always returns `null`, meaning sound is permanently blocked regardless of the UI toggle.
   _Fix: replace the localStorage gate in `playStatusSound()` with a check against the in-memory `notifSettings.sound` object, which IS correctly loaded and saved by the settings UI:_
   ```js
   if (!notifSettings || notifSettings.sound === false) return;
   ```

### Suggestions (non-blocking)

- None.

### Notes

- `notifSettings` is an in-memory object populated by `loadNotifSettings()` from `'tf-notif-settings'` JSON. It is already the canonical source of truth for all notification preferences; `playStatusSound` should use it directly.


---

## Human Review — Round 4

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **`/sounds/idle-ping.mp3` returns 404 — MP3 files not served**
   Browser console shows `GET http://localhost:6006/sounds/idle-ping.mp3 404 (Not Found)` on every status change. The `/sounds/` static route was added and the files were copied to `src/server/sounds/`, but the build script `cp -r src/server/sounds dist/sounds` silently nested the files at `dist/sounds/sounds/` instead of `dist/sounds/` when the destination directory already existed from a prior build.
   _Fix: change build script to `tsup && rm -rf dist/sounds && cp -r src/server/sounds dist/sounds` to ensure a clean copy each build._

2. **Server running pre-fix code — `playStatusSound` still shows old `localStorage.getItem('notif-sound')` gate in browser**
   Confirmed by browser DevTools source view. Server must be restarted after rebuild to pick up the latest binary.

### Suggestions (non-blocking)

- None.

### Notes

- Root cause of 404: `cp -r <src> <dest>` when `<dest>` exists copies `<src>` as a subdirectory of `<dest>`, not into it.
- After fix + rebuild + server restart, sounds should play correctly (gate and Audio API are correct per rounds 3–4).
