# N27 — command hooks and auto lifecycle events — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** https://github.com/Slavo775/insight-flow/pull/20
**Verdict:** approved

## Summary

N27 adds a second tier of events sourced from Claude Code hook subprocesses. `ClaudeHookEvent` (20 types, `source:"hook"`, `hookName`, `sessionId`, `payload`) is unioned with `TaskEvent` throughout the type and schema layers. `log-event` gains `--source hook`, `--hook-name`, `--session-id`, and `--if-active` flags; hook events write to a per-session JSONL at `~/.insight-flow/events-<id>.jsonl` in addition to the per-task `events.json`. An activation flag file (`session-<id>.active`) prevents plain-prompt events from polluting the log. A new `/api/session-events` endpoint returns the most-recent session's events. The dashboard activity feed renders all 20 hook event types with distinct colours, and a "Recent Events" panel auto-refreshes every 5s. Risk is low: the `--if-active` guard is the critical path for correctness, and it exits 0 silently when absent, so no regression to existing flows.

## Checklist verification

- [x] `ClaudeHookEventType` union (20 values) in `types.ts` — pass
- [x] `ClaudeHookEvent` interface with `source:"hook"`, `hookName`, `sessionId`, `taskId`, `payload` — pass
- [x] `source?: "agent" | "hook"` added to `TaskEvent` — pass
- [x] `SessionEventsFile` interface in `types.ts` — pass
- [x] `EventsFile.events` changed to `(TaskEvent | ClaudeHookEvent)[]` — pass
- [x] `ClaudeHookEventSchema` + `SessionEventsFileSchema` in `schema/index.ts` — pass
- [x] `EventsFileSchema.events` uses `z.union([TaskEventSchema, ClaudeHookEventSchema])` — pass
- [x] `log-event --source hook --hook-name --session-id --if-active` flags accepted — pass
- [x] Hook events write to session JSONL (`~/.insight-flow/events-<id>.jsonl`) — pass
- [x] Hook events also append to per-task `events.json` when taskId present — pass
- [x] `--if-active` exits 0 silently when `session-<id>.active` absent — pass
- [x] Activation flag written on `agent-active`, cleared on `agent-idle`/`session-end` — pass
- [x] Agent dedup filter excludes hook events (`source !== "hook"`) — pass
- [x] `/api/session-events` returns most-recent session JSONL events (limit 500) — pass
- [x] Activity feed renders all hook event types with colour-coded icons — pass
- [x] "Recent Events" panel renders in dashboard with 5s auto-refresh — pass
- [x] `pnpm build` passes — pass

## Non-blocking

1. **Dead `recentEventsTimer` variable** — in `dashboard.ts` the `setInterval` return value is assigned to `recentEventsTimer` which is declared but never read. The clear path on panel teardown is absent. Harmless for now since the panel lives for the page lifetime, but worth cleaning up or wiring `clearInterval` if the panel ever becomes collapsible.

2. **No tests for hook path** — `log-event.test.mjs` covers agent events only. The `--source hook`, `--if-active`, session JSONL write, and activation flag mechanics have zero test coverage. Fine for an initial implementation but should be addressed before N28 adds production hook callers that depend on this exact behaviour.

3. **`/api/session-events` returns `sessionId: null` when no JSONL files** — the checklist said the endpoint returns `{ sessionId: "...", events: [] }` on an empty state. The implementation returns `{ events: [], sessionId: null }`. Semantically correct, but the non-null contract in the checklist is broken. No downstream consumer currently relies on this, so deferring to N28.

4. **Source check in `groupConsecutiveEvents` is redundant** — `last.source === (ev.source || 'hook')` is always true for session JSONL events (all have `source:"hook"`), so the check never prevents grouping. Harmless but could mislead a future reader.

## Security & edge cases

No issues. The `--if-active` guard correctly rejects events from non-agent contexts. Session JSONL files are written to `~/.insight-flow/` (user-owned), not the project directory. `/api/session-events` reads only files matching `events-*.jsonl` under the known data dir; no path traversal vectors. `payload` is typed as `Record<string, unknown>` and passed through as-is — safe since it's never eval'd or rendered as HTML (dashboard escapes strings).

## Notes

N28 ships the shell scripts that actually call `log-event --source hook --if-active` from Claude Code hook subprocesses — that's when the activation flag and `--if-active` guard see real use. N28 will also exercise the session JSONL write path in a live environment; the null `sessionId` contract issue above should be revisited then.
