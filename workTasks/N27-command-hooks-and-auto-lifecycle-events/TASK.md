# N27 — hook-sourced event schema and activity/overview display

**Type:** feat
**Priority:** high
**Created:** 2026-05-24
**Modified:** 2026-05-25

## Problem

N26 introduced typed events but they are still agent-called — the AI has to emit `log-event start` etc. manually. The real signal source is Claude Code's hook system: hooks fire automatically on every meaningful moment (session start/end, tool approved/denied, approval required, agent idle, compaction, subagent spawn, etc.) without any AI involvement. These rich, structured signals should be the foundation of insight-flow's event stream, not manual AI calls. The AI emits nothing — the hook infrastructure emits everything.

Critically, events must be **scoped to insight-flow agent sessions only** — not every plain Claude prompt. When a user is having a general conversation, no insight-flow events should fire. Events are only relevant when an insight-flow skill is active (`/task-implement`, `/taskmaster`, `/task-review`, etc.).

## Goal

1. **Extended event schema**: define 20+ `ClaudeHookEventType` values that map directly to Claude Code hook events — covering session lifecycle, tool approval/denial, agent state, task status changes, file operations, and permission prompts. Each type carries a typed `payload` matching the hook's stdin JSON.
2. **`source` field on events**: distinguish `"hook"` (automated, from Claude Code hooks) from `"agent"` (manual, the N26 types). Both share the same `events.json` storage and `/api/events` endpoint from N26.
3. **Activity feed enrichment**: render hook-sourced events with distinct icons, badge colours, and rich payload details (e.g. which tool was denied, which command needed approval).
4. **Overview page events panel**: add a "Recent Events" timeline to `packages/taskflow/src/server/dashboard.ts` overview section — shows the last N cross-task hook events from the session-level event log.
5. **Session-scoped event log**: hook scripts will write to `~/.insight-flow/events-<session-id>.jsonl` (global, append-only). The `/api/session-events` endpoint serves this for the overview panel. Hook scripts themselves ship in the next task — this task only defines schema + rendering.
6. **Insight-flow-scoped activation**: events only fire when an insight-flow skill is the active context. The `UserPromptExpansion` hook (matched to insight-flow skill names) sets an activation flag; all other hooks check that flag before emitting. Plain prompts produce no events.

## Scope

### In scope

- `packages/taskflow/src/types.ts` — add `ClaudeHookEventType` enum (20+ values), `ClaudeHookEvent` interface with `source: "hook" | "agent"`, typed `payload` union. Keep existing `EventType` / `TaskEvent` from N26 as the "agent" tier.
- `packages/taskflow/src/schema/index.ts` — add `ClaudeHookEventSchema`, `SessionEventsFileSchema`.
- `packages/taskflow/src/server/index.ts` — add `/api/session-events` endpoint reading `~/.insight-flow/events-<sessionId>.jsonl` (or most recent session file).
- `packages/taskflow/src/server/dashboard.ts` — enrich `renderActivityItemHtml` with hook event type rendering; add "Recent Events" panel to overview section.
- `packages/taskflow/src/commands/log-event.ts` — accept `--source hook` flag and `--hook-name <name>` flag so hook scripts (when implemented) write properly typed entries.

### Out of scope

- The actual Claude Code hook scripts that fire these events (next task).
- Wiring notifications — approval prompts, idle alerts, done pings (next task).
- Changing N26's dedup logic or the existing `EventType` enum.
- Agent role file changes (agents still call optional N26 events; hook events are invisible to them).

## Event type definitions

Hook-sourced `ClaudeHookEventType` values and their source hook:

| Event type | Source hook | Key payload fields |
|---|---|---|
| `session-start` | `SessionStart` | `session_id`, `source` (startup/resume/compact), `model`, `cwd` |
| `session-end` | `SessionEnd` | `session_id`, `reason` |
| `agent-active` | `UserPromptSubmit` | `session_id`, `prompt` (first 120 chars), `permission_mode` |
| `agent-idle` | `Stop` | `session_id` |
| `turn-failed` | `StopFailure` | `session_id`, `error_type` (rate_limit/auth/billing/server_error) |
| `tool-requested` | `PreToolUse` | `tool_name`, `tool_use_id`, `input_summary` (truncated) |
| `tool-approved` | `PostToolUse` | `tool_name`, `tool_use_id` |
| `tool-failed` | `PostToolUseFailure` | `tool_name`, `tool_use_id`, `error` |
| `approval-required` | `PermissionRequest` | `tool_name`, `tool_use_id`, `input_summary` |
| `approval-granted` | `PermissionRequest` (allow decision) | `tool_name`, `tool_use_id` |
| `approval-denied` | `PermissionDenied` | `tool_name`, `tool_use_id`, `reason` |
| `tool-blocked` | `PreToolUse` (block decision) | `tool_name`, `tool_use_id`, `reason` |
| `subagent-start` | `SubagentStart` | `agent_type`, `agent_id` |
| `subagent-done` | `SubagentStop` | `agent_type`, `agent_id` |
| `file-written` | `PostToolUse` (Write tool) | `path`, `session_id` |
| `file-edited` | `PostToolUse` (Edit tool) | `path`, `session_id` |
| `context-compacted` | `PostCompact` | `session_id`, `trigger` (manual/auto) |
| `config-changed` | `ConfigChange` | `source` (user_settings/project_settings/etc.) |
| `notification` | `Notification` | `notification_type` (permission_prompt/idle_prompt/auth_success/etc.) |
| `task-batch-done` | `PostToolBatch` | `session_id`, `tool_count` |

## Implementation plan

1. **Extend types and schema** (`types.ts`, `schema/index.ts`)
   - Add `ClaudeHookEventType` as a `const` array of all 20 values above.
   - Add `ClaudeHookEvent` interface:
     ```typescript
     interface ClaudeHookEvent {
       id: string;           // nanoid or Date.now() + random
       type: ClaudeHookEventType;
       source: "hook";
       hookName: string;     // e.g. "PreToolUse", "Stop"
       timestamp: string;
       sessionId?: string;
       taskId?: string;      // current insight-flow task at time of event, if any
       payload: Record<string, unknown>;
     }
     ```
   - Extend `TaskEvent` from N26: add `source?: "agent" | "hook"` field (default `"agent"` for backward compat).
   - Add `SessionEventsFile` interface: `{ sessionId: string; events: ClaudeHookEvent[] }`.
   - Add `ClaudeHookEventSchema` + `SessionEventsFileSchema` to `schema/index.ts`.

2. **Extend `log-event` command** (`commands/log-event.ts`)
   - Accept `--source hook` and `--hook-name <name>` flags.
   - When `--source hook`: validate type against `ClaudeHookEventType` enum instead of `EventType`; write to session log `~/.insight-flow/events-<sessionId>.jsonl` (append-only) in addition to task `events.json`.
   - Session ID: from `--session-id <id>` flag or `CLAUDE_SESSION_ID` env var (set by hook infrastructure).
   - `~/.insight-flow/` dir already exists (master lock lives there).

3. **Add `/api/session-events` endpoint** (`server/index.ts`)
   - Reads the most-recent `~/.insight-flow/events-*.jsonl` file (sorted by mtime).
   - Returns `{ events: ClaudeHookEvent[], sessionId: string }`.
   - Optional `?limit=50` param (default 100).

4. **Enrich activity feed rendering** (`server/dashboard.ts`)
   - Add rendering branches in `renderActivityItemHtml` for `tool === 'Event'` with hook event types:
     - `approval-required` → amber warning icon + tool name + "needs approval" badge
     - `approval-denied` / `tool-blocked` → red × icon + tool name
     - `approval-granted` / `tool-approved` → green ✓ icon
     - `session-start` / `session-end` → grey session icon
     - `agent-active` → blue dot + prompt preview
     - `agent-idle` → grey dot
     - `subagent-start` / `subagent-done` → purple subagent icon + agent type
     - `turn-failed` → red error icon + error type
     - `file-written` / `file-edited` → file icon + truncated path
   - Existing N26 agent event types (`start`, `done`, `edit-start`, etc.) keep their current rendering.

5. **Add "Recent Events" panel to overview page** (`server/dashboard.ts`)
   - In the overview section (currently the master iframe), add a sidebar or bottom strip showing the last 20 session events fetched from `/api/session-events`.
   - Auto-refreshes via the existing Socket.IO `workdir-changed` event or a 5 s poll.
   - Groups consecutive same-type events (e.g. 5 `tool-approved` → "5 tools approved").

6. **Insight-flow activation scoping** (schema + flag only — hook wiring in next task)
   - Add `IF_ACTIVE` flag concept: a boolean written to `~/.insight-flow/session-<id>.active` when an insight-flow skill starts; removed when `agent-idle` fires or session ends.
   - Add `--if-active` flag to `log-event`: exits 0 silently if the activation file for the current session does not exist. This lets hook scripts call `log-event ... --if-active` and automatically no-op outside insight-flow sessions.
   - The insight-flow skill names that activate the flag (for reference in next task's hook wiring):
     `task-implement | task-review | task-review-fix | task-human-review | taskmaster | taskmaster-change | task-git | task-incident | task-request-changes | complete-task`

7. **Build + smoke test**
   - `pnpm build` passes.
   - Manual: `insight-flow log-event approval-required --source hook --hook-name PermissionRequest --if-active` → exits 0 silently (no active file) — confirms scoping guard works.

## Verification

```bash
# 1. All 20 ClaudeHookEventType values accepted by log-event
insight-flow log-event session-start --source hook --hook-name SessionStart --task N27
# → exits 0, writes to events.json with source: "hook"

# 2. Invalid hook event type rejected
insight-flow log-event unknown-thing --source hook --hook-name Foo
# → exits 1 with type list

# 3. /api/session-events returns most-recent session events
curl http://localhost:6006/api/session-events
# → { "events": [...], "sessionId": "..." }

# 4. Activity feed renders approval-required with amber badge
insight-flow log-event approval-required --source hook --hook-name PermissionRequest \
  --task N27 --data '{"tool_name":"Bash","input_summary":"git push --force"}'
# Open http://localhost:6006 → activity feed shows amber "needs approval" Bash entry

# 5. pnpm build passes
pnpm --dir packages/taskflow run build
```

## Notes

- **AI emits nothing for hook events**: the hook scripts (next task) call `insight-flow log-event <type> --source hook --if-active`. Claude never calls this — it's the hook infrastructure.
- **Scoping via `--if-active`**: hook scripts always pass `--if-active`. This makes every event a no-op when the user is having a plain conversation. Only when an insight-flow skill is active (flag file exists) do events actually write. The flag is set/cleared by the `UserPromptExpansion` hook matched to insight-flow skill names and the `Stop` hook — both wired in the next task.
- **`source` field is the key divider**: `"agent"` = N26 optional events (still valid, still called by agents for optional phases). `"hook"` = N27 automated events from Claude Code lifecycle.
- **Session log vs task log**: hook events write to both `~/.insight-flow/events-<sessionId>.jsonl` (session-scoped, for overview) and `workTasks/<id>/events.json` (task-scoped, when a current task exists). Some hook events (session-start, turn-failed) have no task context and only go to the session log.
- **Next task** (N28): ships the actual Claude Code hook scripts that call `insight-flow log-event ... --source hook`, wires them into `settings.json` via `install-activity-hook`, and adds notification outputs (`terminalSequence`, OS alerts) for `approval-required`, `agent-idle`, and `task-done` events.
- Related: N26 (event foundation — schema, storage, dedup, /api/events, activity rendering).
