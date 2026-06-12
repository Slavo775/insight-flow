# N33 — Event unique IDs for dedup and dashboard action resolution

**Type:** feat
**Priority:** high
**Created:** 2026-05-25

## Problem

- Events emitted by hooks and `insight-flow log-event` have no stable unique identifier. The dashboard uses a fragile `eventKey(ev)` hash of `(ts + tool + action + source)` for dedup, which collides on rapid same-type events and cannot be used to resolve follow-up actions (e.g. "dismiss this specific permission request").
- N35 (shared status badge) and N36 (sounds) need a reliable event ID to avoid double-triggering on re-render or WS reconnect.

## Goal

1. Every event written to `.taskflow-activity.jsonl` carries a `id` field — a short, globally-unique string (e.g. `evt_<timestamp_ms>_<4-char-random>`).
2. The `log-event` CLI command generates and writes the ID automatically; hook scripts pass it through unchanged if already present.
3. The dashboard replaces `eventKey()` with `ev.id` for the `seenEventKeys` set.
4. Dashboard JS can reference `ev.id` to map incoming events to active UI state (e.g. clear a permission prompt when its originating event ID resolves).

## Scope

### In scope

- `packages/taskflow/src/commands/log-event.ts` — generate `id` field before writing.
- `packages/taskflow/src/types.ts` — add `id?: string` to `ActivityEvent` / `ClaudeHookEvent`.
- `packages/taskflow/src/schema/index.ts` — add `id` to event schemas (optional for backwards compat).
- `packages/taskflow/src/server/dashboard.ts` — replace `eventKey(ev)` dedup with `ev.id` where present; fall back to old key for legacy events without `id`.
- Hook scripts (`packages/taskflow/scripts/` or `.claude/hooks/`) — pass `--id` flag if supported; otherwise leave ID generation to the CLI.

### Out of scope

- Back-filling IDs into existing JSONL log entries.
- Changing the JSONL line format beyond adding the `id` field.

## Implementation plan

1. **Add `id` to types** — `packages/taskflow/src/types.ts`: add `id?: string` to `ActivityEvent`. Same in `ClaudeHookEvent` if separate.

2. **Add `id` to schema** — `packages/taskflow/src/schema/index.ts`: `id: z.string().optional()` in `ActivityEventSchema` and `ClaudeHookEventSchema`.

3. **Generate ID in `log-event` command** — `packages/taskflow/src/commands/log-event.ts`:
   ```ts
   function genEventId(): string {
     return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
   }
   ```
   Set `event.id = genEventId()` before writing to JSONL if `id` is not already set.

4. **Update dashboard dedup** — `packages/taskflow/src/server/dashboard.ts` in `handleIncomingEvent(ev)`:
   ```js
   var key = ev.id || eventKey(ev);
   if (seenEventKeys.has(key)) return;
   seenEventKeys.add(key);
   ```

5. **Expose ID on prepended items** — in `prependActivityItem(ev)`: set `item.dataset.eventId = ev.id || ''` so DOM elements can be targeted by ID for future action resolution.

6. **Build and verify** — `pnpm --dir packages/taskflow run build` exits 0; check that a `pnpm play` session shows events with `id` fields in the JSONL file.

## Verification

- `pnpm --dir packages/taskflow run build` exits 0.
- Run `insight-flow log-event start --task N33`; open `.taskflow-activity.jsonl`; confirm the written line has an `"id":"evt_..."` field.
- Rapid-fire two identical events within 1 s; confirm only one appears in the feed (dedup working).
- DOM elements in the Claude Activity feed have `data-event-id` attributes.

## Notes

- `evt_<ms>_<4-char>` gives ~1.6M combinations per millisecond — sufficient for single-session uniqueness.
- Backwards compat: existing events without `id` continue to use `eventKey()` fallback. No migration needed.
- Foundational for N35 (status badge state), N36 (sound dedup), N37 (title dedup).
- Part of the **claude-status-module** group (N33–N37).
