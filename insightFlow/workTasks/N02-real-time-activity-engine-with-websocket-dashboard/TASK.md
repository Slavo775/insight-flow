# N02 — Real-time activity engine with WebSocket dashboard

**Type:** feat
**Priority:** high
**Created:** 2026-05-14

## Problem

- The taskflow dashboard currently uses SSE for file-change notifications (reload on shard update), but there's no visibility into what Claude is doing **right now** — which tool it's calling, which file it's reading/writing, which task step it's on.
- Users want a live activity feed in the dashboard showing Claude's actions in real-time, similar to a build log or CI pipeline view.
- The engine must be **zero-token-cost for Claude** — Claude should not spend tokens writing status updates. Instead, leverage Claude Code hooks (shell commands that fire automatically on tool calls) to capture activity passively.

## Goal

1. Replace SSE with WebSocket for bidirectional, lower-latency communication between server and dashboard.
2. Implement a **file-based activity engine**: Claude Code hooks write tool-call events to an activity log file; the taskflow server watches it and pushes events over WebSocket.
3. Add a real-time activity panel to the dashboard UI showing live Claude actions (tool name, file path, timestamp, duration).
4. Make the engine configurable — `activityEngine: { enabled: true/false }` in `taskflow.config.json` — so users can disable it to save overhead.
5. Generate the Claude Code hook config during `taskflow init` so it works out of the box.

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — upgrade from SSE to WebSocket (use `ws` npm package or raw `node:http` upgrade)
- `packages/taskflow/src/server/activity.ts` — new module: activity log file watcher + WebSocket broadcaster
- `packages/taskflow/src/server/dashboard.ts` — extract inline HTML into separate module, add activity panel UI
- `packages/taskflow/src/init/index.ts` — generate Claude Code hook config (`.claude/settings.local.json` hooks section) during init
- `packages/taskflow/src/types.ts` — add `ActivityEvent`, `ActivityEngineConfig` types
- `packages/taskflow/src/config.ts` — add `activityEngine` config field with defaults
- Dashboard HTML — add activity feed panel (collapsible sidebar or bottom panel)
- Hook script — `packages/taskflow/src/hooks/activity-hook.sh` (or `.js`) — lightweight script that appends tool-call info to the activity log

### Out of scope

- Persistent activity history (log is ephemeral, cleared on server restart)
- Authentication/authorization on WebSocket
- Multi-user/multi-session support
- Activity analytics or metrics

## Implementation plan

1. **Define types and config**
   - Add to `types.ts`: `ActivityEvent { timestamp, tool, action, filePath?, taskId?, duration?, status }` and `ActivityEngineConfig { enabled, logFile, maxEvents }`
   - Add to `TaskflowConfig`: `activityEngine?: ActivityEngineConfig`
   - Update `config.ts` defaults: `activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 }`

2. **Create the hook script**
   - `packages/taskflow/src/hooks/activity-hook.sh` — a minimal shell script that:
     - Reads the hook event from stdin (Claude Code passes JSON with tool name, input, etc.)
     - Appends a single JSONL line to `.taskflow-activity.jsonl` in the project root
     - Uses only `date`, `cat`, and shell builtins — no Node.js, no npm, zero overhead
   - The hook fires on `PostToolUse` events (after each tool call completes)
   - Event format: `{"ts":"...","tool":"Read","file":"src/foo.ts","hook":"PostToolUse"}`

3. **Create activity engine module**
   - `packages/taskflow/src/server/activity.ts`:
     - `ActivityEngine` class: watches `.taskflow-activity.jsonl` using `fs.watch()`
     - Maintains a ring buffer of last N events (configurable `maxEvents`)
     - Exposes `getRecentEvents()` and `onEvent(callback)` for the server to subscribe
     - Parses each new JSONL line, enriches with task context if possible
   - If `activityEngine.enabled` is false, the module is a no-op

4. **Upgrade server to WebSocket**
   - In `server/index.ts`:
     - On HTTP upgrade request to `/ws`, accept WebSocket connection (use raw `node:http` + `node:crypto` for WS handshake — no external deps)
     - Remove SSE `/api/events` endpoint
     - WebSocket messages: `{ type: "file-change" | "activity" | "snapshot", data: ... }`
     - On new WS connection, send current snapshot (recent activity events + current task state)
     - File watcher events → broadcast `file-change` to all WS clients
     - Activity engine events → broadcast `activity` to all WS clients

5. **Extract and update dashboard HTML**
   - Move inline `DASHBOARD_HTML` from `server/index.ts` to `server/dashboard.ts` as a function `getDashboardHtml(config)`
   - Add activity panel to the dashboard:
     - Collapsible right sidebar or bottom panel
     - Shows scrolling list of recent Claude actions: icon + tool name + file + relative timestamp
     - Color-coded by tool type (Read=blue, Edit=yellow, Bash=green, Write=purple)
     - Auto-scrolls to latest, pauses on hover
     - Shows "Claude is idle" when no events for 5s
     - Connection status indicator (green dot = connected, red = disconnected, auto-reconnect)
   - Update existing dashboard JS to use WebSocket instead of EventSource

6. **Update `taskflow init` to generate hook config**
   - In `init/index.ts`, add step 6: generate/update `.claude/settings.local.json`
   - Add `hooks.PostToolUse` entry pointing to the activity hook script
   - Respect existing hooks — merge, don't overwrite
   - Copy the hook script to `.claude/hooks/taskflow-activity.sh` (or inline it)
   - Only generate if `activityEngine.enabled` is true in config

7. **Config toggle and cleanup**
   - When `activityEngine.enabled: false`:
     - Server skips activity engine initialization
     - Dashboard hides activity panel
     - `taskflow init` skips hook generation
   - Add `.taskflow-activity.jsonl` to generated `.gitignore` entries
   - Server clears the activity log on startup (ephemeral)

## Verification

- `taskflow init` in a fresh project creates hook config in `.claude/settings.local.json`
- Start `taskflow` (server) → dashboard opens with activity panel visible
- Claude Code tool calls appear in the activity panel within ~100ms
- Disable `activityEngine.enabled: false` in config → panel hidden, no hook overhead
- WebSocket auto-reconnects after server restart
- File changes (shard updates) still trigger dashboard refresh via WebSocket
- `pnpm run build` in `packages/taskflow/` succeeds
- `npx tsc --noEmit` passes

## Notes

- **Zero token cost**: The hook is a shell script fired by Claude Code's hook system — Claude doesn't know about it and spends zero tokens. The only "cost" is the shell exec time (~5ms per tool call).
- **Claude Code hooks**: Hooks are configured in `.claude/settings.local.json` under `hooks.PostToolUse`. Claude Code passes a JSON payload to stdin with `{ tool_name, tool_input, tool_output, session_id }`. See Claude Code docs.
- **No external WebSocket deps**: Use raw HTTP upgrade + `node:crypto` for the WS handshake to keep the package dependency-free. The WS protocol for text frames is simple enough to implement in ~50 lines.
- **JSONL format**: One JSON object per line — easy to append atomically, easy to tail-watch, easy to parse incrementally.
- Related: N01 (taskflow package), N00 (dashboard data loading).
