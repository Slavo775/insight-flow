# N26 — activity vs typed events with automation triggers — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** https://github.com/Slavo775/insight-flow/pull/19
**Verdict:** approved

## Summary

N26 replaces the informal `log-activity --phase` milestones with a strict `log-event <type>` typed event system. New types.ts exports (`MANDATORY_EVENT_TYPES`, `OPTIONAL_EVENT_TYPES`, `EVENT_TYPES`, `TaskEvent`, `EventsFile`, `EventsConfig`), a full Zod schema layer, a new `log-event` CLI command with dedup, a `/api/events` REST endpoint, and dashboard rendering for both `tool:"Activity"` and `tool:"Event"` items. Risk is low: the breaking change to `log-activity` (drops `--phase`, changes `tool:"Phase"` → `tool:"Activity"`) is intentional and the old Phase rendering is preserved for backward compat.

## Checklist verification

- [x] `MANDATORY_EVENT_TYPES`, `OPTIONAL_EVENT_TYPES` const arrays — pass
- [x] `EventType` union, `TaskEvent`, `EventsFile`, `EventsConfig` in `types.ts` — pass
- [x] `EventsConfig` on `TaskflowConfig.events` — pass
- [x] `EventTypeSchema`, `TaskEventSchema`, `EventsFileSchema` in `schema/index.ts` — pass
- [x] `log-event <type>` command with 60s dedup — pass
- [x] `log-event` appends `tool:"Event"` to activity log — pass
- [x] Fire-and-forget hooks via `config.events.hooks[type]` — pass
- [x] `log-activity` writes `tool:"Activity"`, `--phase` flag removed — pass
- [x] `/api/events?taskId=Nxx` endpoint — pass
- [x] Activity feed renders `tool:"Event"` mandatory/optional icons — pass
- [x] Activity feed renders `tool:"Activity"` free-form message — pass
- [x] Idle detection on `done` event (not Phase) — pass
- [x] All 8 root role files + templates updated to EVENTS block — pass
- [x] `pnpm build` passes — pass
- [x] `log-event.test.mjs` 6/6 pass — pass
- [x] `log-activity.test.mjs` updated tests pass — pass

## Non-blocking

1. **Silent dedup/write skip without task context** — `log-event` without `--task` and no current task in master.json writes to the activity log only, skips `events.json`, and skips dedup entirely (both gated on `eventsPath` existing). An agent that hasn't called `implement-start` will silently lose dedup. Acceptable for now but worth a comment near the dedup guard in `log-event.ts`.

2. **`events.hooks` config key undiscoverable** — `EventsConfig.hooks` is only reachable via TypeScript types, not documented in CLAUDE.md or README. Low priority since this is an advanced automation feature, but should be added to docs before the next release.

3. **`--phase` flag now silently ignored** — removed from `log-activity.ts` but `ParsedArgs` still accepts arbitrary flags, so old callers get no error — they just write `tool:"Activity"` silently. Clean graceful degradation but any existing project-level hook scripts that pass `--phase` will not notice the behaviour change.

## Security & edge cases

No issues. `/api/events` validates `taskId` with `/^N\d{2,}$/` regex and path-traversal is prevented by the `startsWith` check on the folder name. `spawn` for hooks passes commands to `sh -c` — the commands come from `taskflow.config.json` (trusted config), not from user input.

## Notes

N27 extends `EventsFile.events` to `(TaskEvent | ClaudeHookEvent)[]` and changes `loadEvents()` return type — dependent on this PR merging first.
