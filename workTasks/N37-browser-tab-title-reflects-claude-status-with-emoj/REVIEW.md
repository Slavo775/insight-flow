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
