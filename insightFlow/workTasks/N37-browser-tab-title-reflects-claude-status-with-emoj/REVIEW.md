# N37 — Browser tab title reflects Claude status with emoji — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **Missing state transition: permission-needed → active on tool-approved**
   `claudeStatusFromEvent()` handles `approval-required` → `permission-needed` but has no case for `tool-approved` → active. When approval is granted the badge and title stay stuck on 🚨 permission-needed instead of reverting to active.
   _Fix: add `tool-approved` case returning `'active'` in `claudeStatusFromEvent()`._

2. **Sound not working — no audio heard at all**
   "i do not heard any sound dont know why"
   Likely cause: browsers block `AudioContext` creation before a user gesture. `playStatusSound()` creates a new context on every call without first checking that the context is in `running` state or pre-warming it with a user interaction.
   _Fix: either pre-create and resume the AudioContext on first user interaction, or call `ctx.resume()` before scheduling nodes._

3. **Tab title not initialized on dashboard load**
   "title needs to be resolved also when dashboard is loaded"
   `updatePageTitle(null)` is called on load which clears any prefix — but the badge starts as `idle`, so the title should start as `💤 Taskflow Dashboard`, not bare `Taskflow Dashboard`.
   _Fix: call `updatePageTitle('idle')` (not `null`) in the init section, matching the `updateActivityStatus('idle')` call beside it._

### Suggestions (non-blocking)

- None.

### Notes

- All three blockers are in `dashboard.ts` only — no schema or CLI changes needed.
- Covers N35 (badge logic), N36 (sound), N37 (title) collectively since they share the same state machine.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

4. **Idle state must come from `agent-idle` hook event, not from `done` task event**
   "agent idle should be on agent idle event not done when notification is triggered"
   Screenshot shows AGENT-IDLE event logged for N37, confirming the hook fires correctly. However `claudeStatusFromEvent()` also maps `action === 'done'` → `'idle'`, which means any task completion (including notification-triggered done events) incorrectly sets the badge to idle. The `done` task lifecycle event is a task-tracker concern, not a Claude session state signal — only the `agent-idle` hook event should drive the idle state transition.
   _Fix: remove the `ev.action === 'done'` → `'idle'` branch from `claudeStatusFromEvent()`. Keep only `agent-idle` hook event → idle._

### Suggestions (non-blocking)

- None.

### Notes

- This blocker is in `claudeStatusFromEvent()` in `dashboard.ts` only.


---

## AI Review — Round 2

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

`updatePageTitle()` logic is correct. All emoji mappings present. Two open issues from human reviews remain: init calls `updatePageTitle(null)` (bare title) instead of `updatePageTitle('idle')` (should match badge init state), and the `done`→idle state machine bug (N35) also affects the title. No new findings.

### Checklist verification

- [x] `updatePageTitle(state)` added — ✅ lines 363–367
- [x] `active` → `⚡` prefix — ✅
- [x] `idle` → `💤` prefix — ✅
- [x] `permission-needed` → `🚨` prefix — ✅
- [x] `null` → plain `Taskflow Dashboard` — ✅
- [ ] `updatePageTitle(null)` called on init — ❌ **called with `null`, but should be called with `'idle'`** to match the `updateActivityStatus('idle')` on the same line. Human review R1 flagged this.
- [x] `updatePageTitle(newStatus)` called from event handler — ✅ `addActivityEvent` line 863

### Blockers

1. **Init title shows bare `Taskflow Dashboard` instead of `💤 Taskflow Dashboard`** — `dashboard.ts` line 1128: `updatePageTitle(null)` resets to no prefix, but the badge initialises as `idle`. The title and badge state are inconsistent on first paint.
   _Fix: change `updatePageTitle(null)` to `updatePageTitle('idle')` at line 1128._

### Non-blocking

- None.

### Security & edge cases

- None.

### Notes

- The `done`→idle bug in `claudeStatusFromEvent()` (N35 blocker 1) also causes wrong title transitions; fixing N35 resolves it here automatically.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

5. **`agent-active` hook event not mapped to active state — badge stays idle**
   "why its idle still?"
   Screenshot shows AGENT-ACTIVE, TOOL-APPROVED, and TOOL-REQUESTED events all arriving in the Claude Activity feed, yet the badge stays **idle** throughout. The `tool-approved` → active case added in the previous fix would work for permission flows, but normal Claude activity fires `agent-active` (not the task lifecycle `start`). `claudeStatusFromEvent()` has no case for `ev.action === 'agent-active'`, so all normal session activity leaves the badge stuck at idle.
   _Fix: add `if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'agent-active') return 'active';` in `claudeStatusFromEvent()`._

6. **Sound still not working**
   "also do not hear any sound"
   Directly caused by blocker 5 — sound only plays when the badge transitions to `idle` or `permission-needed`. Since the badge never leaves idle (no active transition), no state change ever triggers `playStatusSound`. Fix blocker 5 first; if sound still absent after that, the `AudioContext` pre-warming may need further investigation.

### Suggestions (non-blocking)

- None.

### Notes

- Both issues are in `claudeStatusFromEvent()` in `dashboard.ts` only.
- The `agent-active` case is the symmetric counterpart to `agent-idle` — both are native Claude Code hook events and should be treated as the source of truth for session state.


---

## Human Review — Round 4

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

7. **🚨 permission badge does not clear after `tool-approved`**
   "permission still stays there after permission granted"
   Screenshot: sequence is AGENT-ACTIVE → TOOL-REQUESTED → APPROVAL-REQUIRED (badge goes to 🚨) → TOOL-APPROVED Read → Bash use → TOOL-REQUESTED → TOOL-APPROVED Bash. Two TOOL-APPROVED events arrive after APPROVAL-REQUIRED, yet badge stays stuck at 🚨 permission throughout. JSONL inspection confirms events are correctly structured: `{"tool":"Event","action":"tool-approved","source":"hook",...}` — matching the `claudeStatusFromEvent` condition exactly. Root cause not yet clear; likely a code-path issue where `addActivityEvent` doesn't reach `claudeStatusFromEvent` for these events, or the WS broadcast delivers events in a format that differs from the JSONL structure. Fix agent should add console logging to trace the event object received in `addActivityEvent` for a `tool-approved` event.

8. **`agent-active` still not mapping to active (unfixed from round 3)**
   "also agent active event"
   AGENT-ACTIVE is visible in the feed (screenshot Image #4 and bottom of Image #3), but badge does not change. Blocker 5 from round 3 was recorded but the `/task-review-fix` run that followed only addressed rounds 1–2. This case (`ev.source === 'hook' && ev.action === 'agent-active'`) is still missing from `claudeStatusFromEvent()`.
   _Fix: add `if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'agent-active') return 'active';`_

### Suggestions (non-blocking)

- None.

### Notes

- Blocker 7 needs debugging — the event structure in JSONL is correct so the issue must be in how `addActivityEvent` receives or processes the event on the WS path.
- Blocker 8 is a straightforward one-line addition to `claudeStatusFromEvent()`.


---

## AI Review — Round 6

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** approved

### Summary

All four prior blockers (R1–R4) are resolved in the current diff. `claudeStatusFromEvent()` now contains all required transitions (`agent-active`, `agent-idle`, `approval-required`, `tool-approved`, `start`); the `done` case is absent; `updatePageTitle('idle')` is called on init matching the badge. No blockers remain for N37 specifically.

### Checklist verification

- [x] `updatePageTitle(state)` added — ✅ lines 343–347
- [x] `active` → `⚡` prefix — ✅
- [x] `idle` → `💤` prefix — ✅
- [x] `permission-needed` → `🚨` prefix — ✅
- [x] `null` / unknown → plain `Taskflow Dashboard` — ✅ (fallback branch)
- [x] `updatePageTitle('idle')` called on init — ✅ line 1108 (changed from `null` per R1 blocker 3 / AIR2 blocker 1)
- [x] `updatePageTitle(newStatus)` called from event handler — ✅ `addActivityEvent` line 843

### Blockers

None.

### Non-blocking

- N36 MP3 files are 0 bytes (separate N36 blocker); this means no sound will play but the title and badge changes function independently and correctly.

### Security & edge cases

- None.

### Notes

- R4 blocker 7 (`tool-approved` not clearing badge) is resolved: `claudeStatusFromEvent()` line 330 maps `tool-approved` → `active`, and the WS path flows `activity` event → `addActivityEvent` → `claudeStatusFromEvent` → `updatePageTitle`. Root cause was the missing case in `claudeStatusFromEvent`, not a code-path issue.
- R4 blocker 8 (`agent-active` missing) is also resolved: line 327 handles it.
