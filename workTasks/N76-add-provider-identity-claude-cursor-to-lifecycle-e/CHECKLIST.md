# N76 — Add provider identity (claude/cursor) to lifecycle events + dashboard — Checklist

## Done criteria

- [ ] `Provider` type + optional `provider` on `TaskEvent`/`ClaudeHookEvent`/`HookEventInput`/`ActivityEvent` (`types.ts`).
- [ ] Matching optional `provider` enum on the Zod schemas (`schema/index.ts`); payloads without `provider` still validate.
- [ ] `cmdLogEvent` + `cli.ts hook` accept `--provider` (default `claude`) and stamp it on event + activity entry + `/log/events` POST.
- [ ] Server forwards `provider` on the `event`/`activity` socket frames; activity→event bridge defaults to `claude`.
- [ ] Dashboard shows a unified "Agent Activity" feed with a per-row claude/cursor badge.
- [ ] Absent provider behaves exactly as today (treated as `claude`) — no regression to Claude flow.
- [ ] Cursor hook generation / `statusFromEvent` Cursor names / notifications NOT touched (reserved for Task B).

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (TS strict)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new provider tests)
- [ ] No regression in existing `log-event` / `event-stream` / `log-events-endpoint` tests

## Verification

- [ ] `insight-flow log-event start --provider cursor` → event in `events.json` tagged `provider: "cursor"`
- [ ] `insight-flow log-event start` (no flag) → `provider` claude/absent, existing behavior intact
- [ ] Dashboard unified "Agent Activity" feed renders the cursor badge for a cursor-tagged event
