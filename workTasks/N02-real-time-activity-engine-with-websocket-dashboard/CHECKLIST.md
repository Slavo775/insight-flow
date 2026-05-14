# N02 — Real-time activity engine with WebSocket dashboard — Checklist

## Done criteria
- [ ] `ActivityEvent` and `ActivityEngineConfig` types defined in `types.ts`
- [ ] `taskflow.config.json` supports `activityEngine: { enabled, logFile, maxEvents }` with defaults
- [ ] Hook script exists and appends JSONL lines to activity log on each Claude Code tool call
- [ ] `ActivityEngine` class watches activity log file, maintains ring buffer, emits events
- [ ] Server upgraded from SSE to WebSocket (`/ws` endpoint)
- [ ] WebSocket broadcasts `file-change` events (replaces SSE)
- [ ] WebSocket broadcasts `activity` events from the activity engine
- [ ] New WS clients receive a snapshot of recent activity on connect
- [ ] Dashboard HTML extracted to `server/dashboard.ts`
- [ ] Dashboard has collapsible activity panel showing live Claude actions
- [ ] Activity panel color-codes tool types and auto-scrolls
- [ ] Connection status indicator in dashboard (connected/disconnected/reconnecting)
- [ ] `taskflow init` generates Claude Code hook config in `.claude/settings.local.json`
- [ ] `taskflow init` copies/generates hook script to `.claude/hooks/`
- [ ] Activity engine is a no-op when `activityEngine.enabled: false`
- [ ] Activity panel hidden in dashboard when engine is disabled
- [ ] `.taskflow-activity.jsonl` added to `.gitignore` during init

## Quality gates
- [ ] `npx tsc --noEmit` passes (both root and packages/taskflow)
- [ ] `pnpm run build` succeeds in packages/taskflow
- [ ] No regressions in existing dashboard (Kanban, stats, task detail still work)
- [ ] WebSocket reconnects automatically after server restart

## Verification
- [ ] Fresh `taskflow init` → `.claude/settings.local.json` contains hook config
- [ ] Start `taskflow` → dashboard opens with activity panel
- [ ] Trigger a Claude Code tool call → event appears in activity panel within ~200ms
- [ ] Set `activityEngine.enabled: false` → restart server → no activity panel, no hook overhead
- [ ] Modify a task shard file → dashboard refreshes via WebSocket (not SSE)
- [ ] Close and reopen dashboard → WebSocket reconnects, receives snapshot
- [ ] Activity log does not persist across server restarts (ephemeral)
