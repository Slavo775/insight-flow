# N33 — Event unique IDs for dedup and dashboard action resolution — Review

## AI Review — Round 1

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

Core ID generation and dedup wiring is correct. `ActivityEvent` gets `id?: string`, the JSONL writer stamps both hook and agent paths, and the dashboard dedup uses `ev.id || eventKey(ev)`. One checklist item was skipped (no `ActivityEventSchema` in schema), which is low risk. Blocker: `ClaudeHookEvent.id` uses a different format than `ActivityEvent.id`.

### Checklist verification

- [x] `id?: string` added to `ActivityEvent` in `types.ts` — ✅ line 218
- [ ] `id: z.string().optional()` added to event schema — ❌ `ActivityEventSchema` does not exist in `schema/index.ts`; JSONL is not Zod-validated on read, so runtime impact is nil, but checklist item incomplete
- [x] ID generation uses `evt_<ms>_<4-char-hex>` format — ✅ `randomBytes(2)` = 4 hex chars in both activity log paths
- [x] `log-event.ts` sets `id` before writing — ✅ hook path line 190, agent path line 250
- [x] Dashboard dedup uses `ev.id || eventKey(ev)` — ✅ `addActivityEvent` line 854
- [x] `prependActivityItem` sets `item.dataset.eventId` — ✅ line 892

### Blockers

1. **`ClaudeHookEvent.id` format inconsistent with spec** — `log-event.ts` line 151 generates hook event IDs as `` `${Date.now()}-${randomBytes(4).toString("hex")}` `` (dash separator, 8 hex chars, no `evt_` prefix). Activity log entries use `evt_<ms>_<4-char>`. Hook events surface in the activity feed; their `data-event-id` DOM values will be in a different format, breaking any consumer that parses the prefix or length.
   _Fix: change line 151 to `` `evt_${Date.now()}_${randomBytes(2).toString("hex")}` ``._

### Non-blocking

- `ActivityEventSchema` absence is a pre-existing gap, not introduced by N33. Safe to leave for a schema cleanup task.

### Security & edge cases

- None.

### Notes

- `randomBytes(2)` = 65536 combinations per ms; sufficient for single-session uniqueness as specified.
