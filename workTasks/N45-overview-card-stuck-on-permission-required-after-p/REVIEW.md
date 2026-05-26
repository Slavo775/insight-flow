# N45 — Overview card stuck on permission-required after permission granted — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Single-line addition to `CLAUDE_STATUS_MAP` in `packages/taskflow/src/server/index.ts`: `"tool-approved": "active"`. This ensures that when a user grants a permission request, a `pushStatusToMaster` call fires and transitions the overview card from red ("permission required") back to green ("active"). Risk is minimal — the map change is purely additive and the `pushStatusToMaster` path it activates is already exercised by every other status transition.

## Checklist verification

- [x] `"tool-approved": "active"` added to `CLAUDE_STATUS_MAP` in `src/server/index.ts:596` — **pass**
- [x] No other source files changed — **pass**
- [x] `pnpm --dir packages/taskflow run build` passes — **pass** (confirmed during implementation)

## Non-blocking

- `tool-blocked` / `approval-denied` events (visible in `dashboard.ts:916`) have no entry in `CLAUDE_STATUS_MAP` either. When a permission is denied, Claude receives a `Stop` event shortly after, which emits `agent-idle` → `"idle"` push, so the card does eventually clear. Not a regression from this PR, but worth a follow-up entry if the denied path needs an immediate status reset.

## Security & edge cases

None. `pushStatusToMaster` is fire-and-forget with a 2 s timeout and swallowed error; sending an extra `"active"` push is idempotent on the master side.

## Notes

- `dashboard.ts:332` already handled `tool-approved` → `active` client-side (per-project badge); this fix brings the master overview card into parity.
- The debounce at line 606–611 means a full state push follows ~2 s after the status push — both paths fire correctly with the fix.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-26
**Verdict:** approved

### Notes

please approved create pr via gh and merge it into master and then bump the version 0.7.1 and publish it
