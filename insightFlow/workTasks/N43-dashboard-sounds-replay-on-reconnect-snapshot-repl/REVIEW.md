# N43 — Dashboard sounds replay on reconnect — snapshot replays playStatusSound for historical events — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds an `isReplayingSnapshot` boolean flag to guard `playStatusSound` from firing during socket reconnect snapshot replay. The fix is 3 targeted lines in `dashboard.ts` with no logic changes to the activity feed, dedup, or rendering paths. Risk is minimal — the guard is synchronous, the flag lifetime is bounded to the snapshot loop, and the `typeof addActivityEvent === 'function'` check already protects the case where `activityEnabled` is false (making the flag inaccessible but also unreachable).

## Checklist verification

- [x] `isReplayingSnapshot` flag declared in activity JS block — `dashboard.ts:801` ✓
- [x] `sock.on('snapshot', ...)` sets `true` before loop, `false` after — `dashboard.ts:767,771` ✓
- [x] `addActivityEvent` skips `playStatusSound` when replaying — `dashboard.ts:850` ✓
- [x] Live `activity` events still trigger sound — `sock.on('activity', ...)` calls `addActivityEvent` with flag `false` ✓
- [x] Build passes — `pnpm build` ✓

## Non-blocking

- The flag is a `var` declared in the `activityEnabled`-conditional script block but used inside `connectWS` which is in the unconditional block. This is correct because `var` is function/script-scoped in JS (hoisted) and the `typeof addActivityEvent === 'function'` guard ensures the flag-touching code never runs when activity is disabled. A comment explaining this scoping dependency would help future readers, but not required.

## Security & edge cases

- Synchronous replay loop: `isReplayingSnapshot` is set back to `false` inside the same tick — no async gap where a live `activity` event could arrive and find the flag `true`. Safe.
- If the server sends an empty `data.activity` array: the loop runs 0 iterations, flag set then immediately cleared. No issue.

## Notes

- Master overview (`overview.ts`) notification sounds via browser `Notification` API are out of scope and unaffected.
- Verification requires manual testing (background tab, return, listen for sounds) — no automated test covers this audio path.
