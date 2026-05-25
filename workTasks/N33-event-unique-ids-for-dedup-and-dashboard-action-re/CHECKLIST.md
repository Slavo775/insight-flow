# N33 — Event unique IDs for dedup and dashboard action resolution — Checklist

## Done criteria

- [ ] `id?: string` added to `ActivityEvent` in `packages/taskflow/src/types.ts`
- [ ] `id: z.string().optional()` added to event schema in `packages/taskflow/src/schema/index.ts`
- [ ] `genEventId()` generates `evt_<ms>_<4-char>` strings in `packages/taskflow/src/commands/log-event.ts`
- [ ] `log-event` command sets `event.id` before writing to JSONL
- [ ] Dashboard `handleIncomingEvent` uses `ev.id || eventKey(ev)` as the dedup key
- [ ] `prependActivityItem` sets `item.dataset.eventId = ev.id || ''` on the DOM element

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] `insight-flow log-event start --task N33` → `.taskflow-activity.jsonl` last line contains `"id":"evt_`
- [ ] Two rapid identical events → only one appears in the activity feed
- [ ] Activity feed DOM items have `data-event-id` attribute set
