# N225 — Hub activity delivery + SW-unified notifications overhaul — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**PR:** (no PR yet — branch `feat/N225-activity-notifications-overhaul`)
**Verdict:** fix-needed

## Summary

The delivery/activity core (port pointer, durable feed, `/unknown` fix) is **correct and verified** — the sha1 key is symmetric between the dashboard and `log-event`, the activity seeding lines up with `readNewLines` (no dup/skip), stale-pid handling is right, and the `underHub()` suppression correctly prevents double-notify (proxied → hub client fires; standalone → project client fires). **Security is clean** (independent pass: static script injection, plain-text Notification titles, `encodeURIComponent`-confined `data.url`, sha1 filename, loopback POST). But the new shared notification client has one **HIGH** bug — a spurious "needs permission" notification fires on every hub page load — plus a duplicate-across-tabs issue. REQUEST CHANGES. Risk: medium (the delivery half is solid; the notification client needs the first-frame guard + dedup).

## Checklist verification

- [x] Port pointer + `log-event` real-port delivery — pass (symmetric key, `INSIGHT_FLOW_CONFIG_DIR` honored, stale-pid handled; + test)
- [x] Durable activity feed (no wipe on start/shutdown; SIGTERM added) — pass (seeding aligns with `readNewLines`)
- [x] No `Skill/completed skill:"unknown"` (hooks v3→4) — pass (bash logic correct)
- [x] `/hub-notify.js` served + injected into overview + proxied pages; `underHub()` gates the project client — pass (no double-notify; valid JS)
- [~] "Claude is done" fires from any hub page — mechanism correct, but see Blocker 1 (permission sibling) + Blocker 2 (dedup); live confirm pending
- [x] Sounds unlock on gesture — pass
- [x] typecheck / eslint / tests (350, +1) — pass
- [~] `done`/`fixed`/`changes-implemented` — added to the hub `WATCHED`; native hook deferred (documented)

## Blockers

1. **HIGH — spurious "needs permission" notification (+ alert sound) on every hub page load.**
   `master/server.ts:183–185` (`MASTER_NOTIFY_JS`). The `claudeStatus` block guards `cs&&cs!==pc`; the **done** branch is first-frame-safe (`pc==='active'`, and `pc` is `undefined` on load), but the **permission** branch (`:185`) fires whenever `cs!==pc` — and on a fresh page `prevClaude` is empty, so `pc===undefined`. On load the overview calls `refreshProjects()` → the master re-broadcasts every project's *current* state to all `/events` clients, so **any project sitting in `permission-required`/`awaiting-permission` triggers an immediate "needs permission" notification + `sound(true)`** every time you open the hub or navigate to a project — nothing changed.
   **Fix:** first-frame-guard the whole `claudeStatus` block, e.g. `if (cs && pc !== undefined && cs !== pc) { … }` (the `done` branch keeps its `pc==='active'` check).

2. **MEDIUM — duplicate notifications across multiple open hub pages.**
   `master/server.ts:151–156` (`notify`). Every hub page now runs its own `/hub-notify.js` with an independent EventSource + `prevTask`/`prevClaude`, and `showNotification` sets **no `tag`**, so the SW can't collapse duplicates. Two open tabs (overview + a project) → a single real transition fires two OS notifications.
   **Fix:** pass a stable `tag` (e.g. `p.id + ':' + status`) in the `showNotification` options so duplicates coalesce.

## Non-blocking

1. **`log-event` can throw on the hook path (breaks the "never break the hook" contract).** `cli/commands/log-event.ts:272` uses the throwing `resolveProjectRoot()`, while `config` is built via the *safe* variant that falls back to cwd. In the rare case no project root resolves, this line throws before `postToLogEvents` and violates the documented fire-and-forget invariant. Common case is fine (cache warm). Fix: use the safe variant / wrap in try-catch (`readServerPortPointer(safeResolveProjectRoot(process.cwd()) ?? "") ?? config.server.port`).
2. **`active→idle` flicker could over-notify "Claude finished."** `server.ts:184` fires on any active→idle transition; if the master's `claudeStatus` oscillates active↔idle mid-turn, it repeats. Confirm the pushed status is debounced (as the project's own `event-stream.ts` is) or add a small guard.
3. **pid reuse** (`global-config.ts:132`) — after `kill -9`, a recycled pid makes a stale pointer read as live → wrong port. Rare (graceful shutdown clears it). Optional: also check `startedAt` age.
4. **Truncation race in `activity.ts start()`** — a concurrent append between read and rewrite is lost. Practically unreachable at boot. Note only.
5. **Deferred by design (documented in CHECKLIST):** a *dedicated* lifecycle-events tab (2b) — events now show durably in Agent Activity; and the native `notify-hook.ts` task-done case + its `/api/agent-done` wrong-port POST (the hub "Claude finished" path via `claudeStatus` covers the main case). Confirm these stay as a follow-up.

## Security & edge cases

Independent pass: **no findings.** The injected `<script src="/hub-notify.js">` is a static literal (no request/registrant data); `MASTER_NOTIFY_JS` is a static constant; notification titles reach only the plain-text Notification API (no DOM/`innerHTML`/`eval`); `data.url` is `encodeURIComponent`-confined to same-origin `/project/…` (no open-redirect / `javascript:`); the port-pointer filename is sha1-derived (no traversal) and the POST is loopback-fixed. **Informational (pre-existing, not N225):** `/events` is `ACAO:*` + ungated, so any origin can already read `project-update` frames — N225 doesn't worsen it; consider gating `/events` with `isTrustedLocalRequest` in a follow-up.

## Notes

- The delivery half (port + durable feed + `/unknown`) is solid and independently valuable; both blockers are localized to the `MASTER_NOTIFY_JS` `claudeStatus` branch + `notify()` tag.
- Live confirmation (global reinstall + hub restart) still pending — worth doing after the fixes.
- Next: `/task-review-fix` for Blockers 1 & 2 (+ non-blocking 1, cheap), then re-review.

---

## Fixes applied (task-review-fix, 2026-07-12)

**Blocker 1 (HIGH) — spurious "needs permission" on load → FIXED.** `MASTER_NOTIFY_JS`: the `claudeStatus` block is now `if(cs && pc!==undefined && cs!==pc)`, so the first frame after connect / a `refreshProjects` re-broadcast only *seeds* `prevClaude` — no notification fires on page load. (`server.ts`)

**Blocker 2 (MEDIUM) — duplicate across tabs → FIXED.** `notify()` now sets a stable `tag` (+ `renotify:true`) so the same transition seen by multiple hub pages collapses into one OS notification. Task-status notifs use `id:taskId:status`; claude ones use `id:done` / `id:perm`. (`server.ts`)

**Non-blocking 1 — `log-event` hook safety → FIXED.** `readServerPortPointer(resolveProjectRoot())` is wrapped in try/catch (falls back to `config.server.port`), so a `resolveProjectRoot()` throw can never break the Claude hook. (`log-event.ts`)

**Non-blocking 2 — flicker → FIXED.** "Claude finished" now fires only on `active→done` (not `→idle`, a mid-turn pause), avoiding repeat notifications if the status oscillates.

**Remaining non-blocking (accepted / follow-up):** pid-reuse stale port (rare; graceful shutdown clears it), the boot truncation race (unreachable in practice), the pre-existing open `/events` SSE, and the deferred events-tab + native `notify-hook.ts` tweaks.

**Gates:** typecheck clean, eslint clean, `/hub-notify.js` re-validated as valid JS, `npm test` → **350**. Security unchanged (verified clean in round 1).

**Verdict after fixes:** ready for re-review. Live confirmation (global reinstall + hub restart) recommended.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

Both Round-1 blockers are fixed and verified in code; the non-blocking hook-safety + flicker items are also addressed. The fixes introduce no new correctness issues. One minor residual on `notify()` dedup (uncommon multi-tab case) is non-blocking. APPROVE — with a live smoke test recommended since notification behavior isn't fully unit-testable.

### Checklist verification

- [x] **Blocker 1 (spurious permission on load) resolved** — `if(cs && pc!==undefined && cs!==pc)` (server.ts:190): the first frame / a `refreshProjects` re-broadcast only seeds `prevClaude`, so nothing fires on page load. Verified.
- [x] **Blocker 2 (dup across tabs) resolved (core)** — `notify()` sets a stable `tag` (server.ts:155); the same transition across tabs collapses to **one** OS notification bubble. Tags: `id:taskId:status`, `id:done`, `id:perm`.
- [x] Non-blocking 1 (hook safety) — `log-event`'s pointer read wrapped in try/catch → can't break the hook.
- [x] Non-blocking 2 (flicker) — "Claude finished" fires only on `active→done` (not `→idle`), which is also the semantically-correct finish signal.
- [x] typecheck / eslint / `/hub-notify.js` valid JS / `npm test` → 350.
- [x] Live-verified deploy: port pointer written (`6007`), `/hub-notify.js` served + injected into overview **and** proxied project.

### Blockers

None.

### Non-blocking (residual / follow-up)

1. **Multi-tab *audible* dedup (minor).** The `tag` collapses the visual bubble across tabs, but `renotify:true` re-alerts on the same-tag replacement, and each tab also runs its own `sound()` — so with multiple hub tabs open at once a real transition can still buzz twice. Uncommon (users typically have one PWA/tab). A cleaner fix: include the frame's `lastSeenAt` in the tag + `renotify:false` (distinct events still alert; same-event-across-tabs stays silent), and/or a leader-elected sound. Follow-up.
2. **Live-confirm the `done` signal.** "Claude finished" now requires `claudeStatus` `active→done`. This is correct *if* the Stop-hook derivation pushes `done` (per `event-stream.ts`); the earlier port bug meant this path was never exercised end-to-end. Confirm on the live hub that a finished turn actually yields `done` (not only `idle`), else re-add `idle`.
3. Carried from Round 1: pid-reuse stale port, boot truncation race, pre-existing open `/events`, deferred events-tab + native-hook — all accepted follow-ups.

### Security & edge cases

Unchanged from Round 1 — **no findings** (the fixes only touched the `notify()` options + the transition guard + a try/catch; no new input reaches a sink).

### Notes

- The whole subsystem is now in a good state: delivery half solid + verified, notification half fixed with only a minor multi-tab-audible residual.
- Next (gated): human review + a live smoke test (badge live, events populate, "Claude finished" backgrounded), then `/task-git`.


---

## Round 3 — fix-needed

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-12
**Verdict:** fix-needed

### Summary

Live-tested on the hub (mobile + desktop). Delivery half works. **One regression: the notification sound got worse.** Human words: *"its different sound like before why? the sound before this task was better."* The pre-N225 sound (the richer multi-note chime) is preferred; N225's hub sound is a plainer single beep.

### Blockers

1. **SOUND REGRESSION — the hub notification sound is worse than before N225.**
   Root cause (two parts, both in `/hub-notify.js` = `MASTER_NOTIFY_JS` in `master/server.ts`):
   - **(a) Wrong fallback beep.** `tone()` in `/hub-notify.js` is a **single flat beep** (`o.frequency.value = alert ? 660 : 440`, 0.25s). The pre-N225 project client (`notifications.ts` `playTone`) played a **richer multi-note chime** — idle: `880Hz → 660Hz`; permission: `660 → 880 → 660Hz`, sine waves with gain ramps. When the hub falls back to the synthesized beep, it sounds plainer/harsher than before.
   - **(b) Audio-unlock gate forces the beep instead of the mp3.** `sound()` has `if(!audioOn){ tone(alert); return; }` — before the user's first click/keydown on the page, it plays the synthesized single beep and **never even tries** `idle-ping.mp3` / `permission-alert.mp3`. The old project code (`playStatusSound`) always attempted the mp3 first (`new Audio(src).play().catch(()=>playTone(state))`), so it fell back to the *chime* only when autoplay was blocked — and played the real mp3 as soon as it was allowed.
   **Fix:** (1) make `/hub-notify.js` attempt the mp3 first and only fall back to `tone()` (mirror `playStatusSound`), removing the pre-gesture `if(!audioOn)` short-circuit that skips the mp3; (2) port the richer multi-note chime from `notifications.ts` `playTone` into `/hub-notify.js` `tone()` so the fallback matches the pre-N225 sound. Net: hub sound == old project sound (mp3 primary, nice chime fallback).

### Non-blocking

- (carried) The Round-2 audible multi-tab dedup + live `done`-signal confirm remain follow-ups.

### Security & edge cases

No new surface — the fix only changes client-side audio playback (mp3 attempt + a richer Web-Audio fallback tone); no request data reaches a sink.

### Notes

- Everything else from N225 is accepted as working on the live hub. This is a sound-only regression.
- Next (gated): `/task-review-fix` on the single blocker → re-verify sound on the hub → human re-approve → `/task-git` merge to `dashboard-improvements`.

---

## Fixes applied (task-review-fix, round 3, 2026-07-12)

**Blocker 1 (sound regression) → FIXED.** Two changes to `MASTER_NOTIFY_JS` (`/hub-notify.js`) in `master/server.ts` so the hub sound matches the pre-N225 project client (`notifications.ts`):
- **(a) mp3-first, no pre-gesture short-circuit.** Removed `if(!audioOn){ tone(alert); return; }` from `sound()`. It now always does `new Audio(src).play().catch(tone)` — the bundled mp3 (`idle-ping.mp3` / `permission-alert.mp3`) plays as soon as autoplay allows, and the chime is only the fallback. Removed the now-dead `audioOn` flag + `unlock` gesture listener.
- **(b) richer chime fallback.** `tone()` now plays the same multi-note sine melody as `notifications.ts` `playTone` — idle: `880Hz → 660Hz` (0.3s, gain 0.2/0.15); permission: `660 → 880 → 660Hz` (gain 0.3) — with a per-note exponential gain ramp and a 1.2s ctx close, instead of the single flat 440/660Hz beep.

Net: hub notification sound == the pre-N225 sound (mp3 primary, nice chime fallback). No behavior change to *when* sounds fire — only *what* plays.

**Gates:** typecheck clean; `/hub-notify.js` re-validated as valid JS (4839 chars); eslint clean on `server.ts`; `npm test` → **350** (unchanged). No new security surface (client audio only).

**Verdict after fix:** ready for human re-verify on the live hub (global reinstall + hub restart), then re-approve → `/task-git`.


---

## Round 4 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

Re-review of the round-3 sound-regression fix (`MASTER_NOTIFY_JS` in `master/server.ts`). The fix is **correct and restores the pre-N225 sound**. Diffed the two audio paths and made a key discovery that confirms the fix is exactly right: **the bundled mp3s are 0-byte placeholders** (`src/dashboard/server/sounds/*.mp3` and `dist/sounds/*.mp3`, committed 2026-06-14, 0 bytes), so *no* recorded mp3 has ever actually played. The pre-N225 project client (`playStatusSound`) HEAD-checks `content-length > 0`, sees 0, and **always falls back to `playTone`** — the rich multi-note chime. That chime is the "better" sound the user remembers. N225's original hub `tone()` was a single flat 440/660 Hz beep → the regression. The fix ports the exact `playTone` chime into the hub `tone()`, so **hub sound == pre-N225 sound**. APPROVE.

### Checklist verification

- [x] **Chime matches `notifications.ts` `playTone` exactly** — idle: `beep(880,n,0.3,0.2); beep(660,n+0.12,0.3,0.15)`; permission: `beep(660,n,0.18,0.3); beep(880,n+0.22,0.18,0.3); beep(660,n+0.44,0.25,0.3)`. Same freqs/durations/gains, `sine`, per-note exp gain ramp, 1.2 s ctx close. Verified line-by-line.
- [x] **mp3-first, reliable fallback** — `new Audio(src).play().catch(tone)`. With the empty mp3, `.play()` rejects (NotSupportedError post-gesture / NotAllowedError pre-gesture) → `.catch` fires the chime. Either path yields the chime; no silent path.
- [x] **Pre-gesture short-circuit removed** — the `if(!audioOn){tone;return}` that forced the plain beep is gone; dead `audioOn` flag + `unlock` listener removed. No remaining refs (grep clean).
- [x] **`settings.sound===false` / `muteFocused && !hidden` mutes still honored** — unchanged, still checked before playback.
- [x] Master serves `/sounds/*.mp3` (200) and SW `SHELL` precaches them — serving path intact (bytes are empty, see finding).
- [x] Gates: typecheck clean · `/hub-notify.js` valid JS (4855 bytes served) · eslint clean · `npm test` → **350**.
- [x] Live: rebuilt + reinstalled global 2.3.1 + hub restarted; served `/hub-notify.js` confirmed to contain the chime + mp3-first, and the old short-circuit is gone.

### Blockers

None.

### Non-blocking

1. **The mp3s are 0-byte placeholders repo-wide** (`src/dashboard/server/sounds/idle-ping.mp3`, `permission-alert.mp3` — and their `dist/` copies). Consequence: the "mp3-first" path *never* plays a recorded sound anywhere (project or hub) — every notification sound is the synthesized Web-Audio chime. Not a regression and not introduced by N225; the fix is correct regardless. Follow-up options: (a) ship real mp3s, or (b) drop the mp3 attempt and call `tone()` directly. Until then the chime is the product sound by default.
2. **Hub `sound()` skips the `HEAD content-length` guard** that the project `playStatusSound` uses. Currently harmless (empty mp3 → `.play()` rejects → chime), but it means a failed `Audio` load + a console error per notification. If real mp3s are later shipped this is fine; if they stay empty, mirroring the HEAD guard (or calling `tone()` directly) would avoid the wasted request + console noise. Minor.
3. (carried) Multi-tab *audible* dedup and the live `done`-signal confirm remain follow-ups.

### Security & edge cases

No new surface. The change is client-side audio only — no request data reaches a sink; `MASTER_NOTIFY_JS` remains a static constant injected as a static `<script src>`. Unchanged from rounds 1–2 (clean).

### Notes

- The whole subsystem is in a good state; this round is a clean, well-scoped sound fix.
- Recommend a quick live ear-check on the hub (tap once, trigger a "Claude finished") to confirm the chime plays — then human re-approve → `/task-git` merge to `dashboard-improvements`.
- Suggest logging the empty-mp3 finding as a small follow-up task (ship real sounds, or simplify to `tone()`).


---

## Round 5 — approved

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-12
**Verdict:** approved

### Summary

Human words: *"approved merge into base branch"* — the round-3 sound-regression fix is accepted after the live hub reinstall. Merge N225 into `dashboard-improvements`.

### Blockers

None.

### Suggestions (non-blocking)

- The empty-mp3 finding (0-byte placeholder sounds) is accepted as a follow-up, not a blocker for N225.

### Notes

- Proceeding to `/task-git` — merge `feat/N225-activity-notifications-overhaul` → `dashboard-improvements`.
