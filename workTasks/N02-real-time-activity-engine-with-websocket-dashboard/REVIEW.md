# N02 — Real-time activity engine with WebSocket dashboard — Review

**Reviewer:** Task Reviewer (AI)
**Verdict:** FIX NEEDED

---

## Summary

The implementation covers all major components: types, config, WebSocket server (raw node:http, zero deps), activity engine with file watcher + ring buffer, dashboard with collapsible activity panel, and Claude Code hook generation during init. Typecheck and build pass. However, there is one blocker and several non-blocking issues.

**Risk:** Medium — new server modules, custom WebSocket frame handling.

## Checklist verification

- [x] `ActivityEvent` and `ActivityEngineConfig` types defined in `types.ts`
- [x] `taskflow.config.json` supports `activityEngine: { enabled, logFile, maxEvents }` with defaults
- [x] Hook script exists and appends JSONL lines to activity log
- [x] `ActivityEngine` class watches activity log file, maintains ring buffer, emits events
- [x] Server upgraded from SSE to WebSocket (`/ws` endpoint)
- [x] WebSocket broadcasts `file-change` events (replaces SSE)
- [x] WebSocket broadcasts `activity` events from the activity engine
- [x] New WS clients receive a snapshot of recent activity on connect
- [x] Dashboard HTML extracted to `server/dashboard.ts`
- [x] Dashboard has collapsible activity panel showing live Claude actions
- [x] Activity panel color-codes tool types and auto-scrolls
- [x] Connection status indicator in dashboard (connected/disconnected/reconnecting)
- [x] `taskflow init` generates Claude Code hook config in `.claude/settings.local.json`
- [x] `taskflow init` copies/generates hook script to `.claude/hooks/`
- [x] Activity engine is a no-op when `activityEngine.enabled: false`
- [x] Activity panel hidden in dashboard when engine is disabled
- [ ] `.taskflow-activity.jsonl` added to `.gitignore` during init — **code exists but not tested (init hasn't run)**

## Issues found

### Blocker 1 — New files not staged/committed

`ws.ts`, `activity.ts`, and `dashboard.ts` are untracked (`??` in git status). They were created via the Write tool but never `git add`ed. The build succeeded because tsup resolves imports from source, but these files won't be in the commit.

**Fix:** Stage and commit the 3 new files before pushing.

### Non-blocking — CSS `display: none` then `display: flex` conflict

`dashboard.ts` line 70: `.activity-panel` has `display: none` followed by `display: flex` in the same rule block. The second declaration wins, meaning the panel is always visible even before toggling. It should start as `display: none` and only the `.open` variant should set `display: flex`.

**Fix:** Remove the `display: flex` from `.activity-panel` base rule, keep it only on `.activity-panel.open`.

### Non-blocking — `addActivityEvent` called when activity is disabled

In the dashboard JS, `ws.onmessage` calls `addActivityEvent()` for snapshot/activity messages, but when `activityEnabled` is false, `addActivityEvent` is never defined (it's inside the `if (activityEnabled)` block). This would throw a `ReferenceError` if the server somehow sent activity events while the dashboard has it disabled.

**Fix:** Guard the calls with `typeof addActivityEvent === 'function'` or define a no-op stub when disabled.

### Non-blocking — Unused `ActivityEngineConfig` import in init

`init/index.ts` imports `ActivityEngineConfig` but never uses it as a type annotation (the function param types are already covered by `TaskflowConfig`).

## Quality gate results

- `npx tsc --noEmit` (package): PASS
- `npx tsc --noEmit` (root): PASS
- `pnpm run build`: PASS (dist/cli.js 78.83 KB, dist/index.js 46.96 KB)
- Existing dashboard functionality: preserved (Kanban, stats, timeline, detail panel all present)

## Next actions

1. **[Blocker]** `git add` the 3 new server files (`ws.ts`, `activity.ts`, `dashboard.ts`)
2. Fix the CSS `display` conflict in `.activity-panel`
3. Guard `addActivityEvent` calls for the disabled case
4. Remove unused `ActivityEngineConfig` import from init
