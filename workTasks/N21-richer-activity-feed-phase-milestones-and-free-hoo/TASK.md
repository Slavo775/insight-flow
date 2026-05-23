# N21 — Richer activity feed — phase milestones and free hook enrichment

**Type:** feat
**Priority:** high
**Created:** 2026-05-23
**Modified:** 2026-05-23

## Problem

The activity panel today shows bare tool calls (`Read /path`, `Bash <cmd>`) in an expanding popup with no order guarantee, no cap, and timestamps that freeze once rendered. A glance does not tell the user what phase the agent is in (exploring, editing, testing, reviewing). Two ways to enrich without per-tool semantic narration: (A) free hook events (PreToolUse / UserPromptSubmit / Stop), and (B) the agent calling `insight-flow log-activity` at coarse phase boundaries. Both must be opt-out via config.

Beyond enrichment, five UX gaps also need closing in this task:
- The "Claude Activity" element is a popup — it should be a collapsible aside panel.
- Relative timestamps freeze on render; they must recompute on every WebSocket tick.
- The feed has no cap and no order — it needs a 50-item ceiling and newest-first ordering.
- The master server has no activity endpoint, so the multi-project overview cannot show what each project is doing.
- The overview has no clear active/idle signal — "idle" must be set explicitly by a `done` phase event, not inferred from timeouts.

## Goal

1. UserPromptSubmit / Stop / PreToolUse hooks emit "Started /<skill>", "Completed /<skill>", and command classifications ("Running tests", "Committing", "Pushing", etc.) into `.taskflow-activity.jsonl`.
2. Dashboard renders enriched events with badges + readable labels; falls back to bare tool + file for unclassified events.
3. New `insight-flow log-activity "<message>"` CLI subcommand appends `{ ts, tool: "Phase", action: "milestone", message }` to the activity log; near-instant (~50 ms); fire-and-forget.
4. Agent role files include a terse "PHASE MARKERS" section with recommended calls: start, research-start, research-end (with summary output), edit-start, edit-end (with summary output), done. 5–10 calls per task max.
5. New `activityEngine.verbosity` config (`"milestones"` | `"detailed"` | `"both"`, default `"both"`): `"milestones"` shows only Phase + Skill events; `"detailed"` shows only raw tool events (current behaviour); `"both"` shows everything.
6. "Claude Activity" popup replaced by a collapsible aside panel (expanded by default, collapse/expand toggle preserved across page reloads via `localStorage`).
7. Activity timestamps recomputed on every WebSocket message — not only when new items arrive, so "2 minutes ago" stays accurate for all visible items.
8. Feed capped at 50 items (newest-first); excess items dropped from the tail on every update.
9. Master server (`insight-flow-master`) exposes `GET /api/activity/:projectName` returning the last 3 activity events for that project; the multi-project overview card shows these below the project status.
10. `--phase done` event drives the project's active/idle state: the overview marks a project **active** whenever any activity event arrives, and **idle** only when a `done`-phase event is received — never via timeout or inference.
11. Total agent-side token overhead stays under 500 tokens per task with phase markers enabled; zero when disabled.

## Scope

### In scope

- `packages/taskflow/src/activity-hook.ts` — extend with new hook generators for `UserPromptSubmit` and `Stop` events; add a classifier table for `PreToolUse` (command → label).
- `packages/taskflow/src/init/index.ts` — install all three new hooks alongside the existing `PostToolUse` taskflow-activity.sh; register them in `.claude/settings.local.json`. Each is idempotent.
- `packages/taskflow/src/commands/log-activity.ts` (new) — `cmdLogActivity(config, opts)` appends one JSONL line with `tool: "Phase"`; fire-and-forget; respects `activityEngine.phaseMarkers === false` by exiting 0 silently.
- `packages/taskflow/src/cli.ts` — register `log-activity` subcommand.
- `packages/taskflow/src/types.ts` + `packages/taskflow/src/config.ts` — add `activityEngine.phaseMarkers: boolean` (default `true`), `activityEngine.hookEnrichment: boolean` (default `true`), and `activityEngine.verbosity: "milestones" | "detailed" | "both"` (default `"both"`).
- `packages/taskflow/src/server/dashboard.ts` —
  - Replace activity popup with a collapsible aside panel; expand/collapse state persisted in `localStorage`.
  - `renderActivityItem(ev)` branches on `ev.tool`: `"Phase"` → accent badge + bold message (no file path); `"Skill"` → secondary badge + started/completed verb; `"Tool"` with `label` → friendly label + muted raw command; otherwise → existing behaviour.
  - Apply `verbosity` filter client-side: `"milestones"` hides raw Tool events; `"detailed"` hides Phase + Skill events.
  - On every WebSocket message, recompute all visible timestamps (not just the new entry).
  - Cap the rendered list at 50 items; render newest-first.
- `packages/taskflow/src/server/master/` (master server) — add `GET /api/activity/:projectName` that reads the last 3 lines from that project's `.taskflow-activity.jsonl` and returns them as JSON. Multi-project overview card renders these lines below the project status badge.
- Multi-project overview card (`dashboard.ts` master view) — display `active` badge when any activity event is present in the current session; switch to `idle` badge only when the latest Phase event has `action: "done"`.
- Canonical role files (`TASKMASTER_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASK_GIT_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`) — append a tight "PHASE MARKERS" section listing the recommended call points (including research-start/end with output summary, edit-start/end with output summary, done).
- `packages/taskflow/templates/roles/*` — mirror via the existing sync-roles script.
- `packages/taskflow/README.md` — document the new hooks, the CLI subcommand, all three config toggles, and the done-event idle convention.

### Out of scope

- Per-tool semantic narration ("analyzing X", "understanding Y").
- Replacing the existing PostToolUse hook (it stays — provides the raw fallback).
- Changing the JSONL schema for non-Phase entries.
- Multi-project overview core implementation (N20).
- Notifications (N19).
- WebSocket protocol changes — new event types ride the existing channel as-is.

## Implementation plan

1. **Config schema.**
   - Add `phaseMarkers?: boolean`, `hookEnrichment?: boolean`, and `verbosity?: "milestones" | "detailed" | "both"` (all default `true` / `"both"`) to `ActivityEngineConfig` in `types.ts`. Wire defaults in `config.ts`. Update `buildConfigWithExamples` so the example config shows all three keys.

2. **New CLI subcommand `log-activity`.**
   - New file `packages/taskflow/src/commands/log-activity.ts`. `cmdLogActivity(config, opts)`:
     - If `activityEngine.enabled === false` OR `activityEngine.phaseMarkers === false`, exit 0 silently.
     - Otherwise append `{ ts, tool: "Phase", action: opts.phase ?? "milestone", message }` to `config.activityEngine.logFile`.
     - All errors swallowed; exits in < 100 ms.
   - Register in `cli.ts`. Help: `log-activity "<message>" [--phase <name>]   Emit a phase milestone (no-op when phaseMarkers is false)`.

3. **Free hooks.**
   - In `activity-hook.ts` (or sibling `activity-hooks-enrichment.ts`), add shell-script generators for:
     - `UserPromptSubmit` — detects slash-command prompts (`^/(\w+)`), emits `{ tool: "Skill", action: "started", skill: "<name>" }`.
     - `Stop` — emits `{ tool: "Skill", action: "completed", skill: "<last-detected-or-unknown>" }`; tracks last-started skill via a tiny side file.
     - `PreToolUse` — classifies commands: `pnpm test|npm test|yarn test` → "Running tests"; `git commit` → "Committing"; `git push` → "Pushing"; `gh pr create` → "Creating PR"; `pnpm build|npm run build` → "Building". Emits `{ tool: "Tool", action: "classified", label, original }`.
   - Gate generation on `activityEngine.hookEnrichment === true`.

4. **Dashboard — aside panel + feed UX.**
   - Replace the activity popup in `dashboard.ts` with a collapsible aside panel (`<aside id="activity-panel">`). Collapse/expand toggle writes `activityPanelCollapsed` to `localStorage`; on page load, restores the saved state.
   - On every WebSocket message (including keep-alives), walk all rendered activity items and recompute their relative timestamps (`timeAgo(ev.ts)`) — not only the newly prepended entry.
   - Prepend new events to the top of the list (newest-first). After each update, trim the list to 50 items by removing excess tail entries.
   - Apply `verbosity` filter: read `window.__VERBOSITY__` (injected by server from config). `"milestones"` → hide items with `ev.tool !== "Phase" && ev.tool !== "Skill"`; `"detailed"` → hide Phase + Skill items; `"both"` → show all.
   - `renderActivityItem(ev)`: `"Phase"` → accent badge, bold message, no path; `"Skill"` → secondary badge + verb; `"Tool"` with `label` → friendly label + muted raw; otherwise → existing.

5. **Master server — activity endpoint + done-idle signal.**
   - In the master server, add `GET /api/activity/:projectName`: resolve the project's `.taskflow-activity.jsonl` path (from master's known project list), read the last 3 lines, return as `{ project, events: ActivityEvent[] }`. Return 404 for unknown projects; 200 with empty events if file not found.
   - Multi-project overview card: fetch the project's last 3 events on load + on each master WebSocket tick. Render them as a mini-feed below the status badge. Derive the active/idle badge solely from the latest Phase event's `action`: `"done"` → idle badge; any other activity event → active badge; no events → no badge (neutral).

6. **Agent role files — "PHASE MARKERS" section.**
   - Append to each role file:
     ```
     PHASE MARKERS
     - Start of work:       `insight-flow log-activity "starting <task-id>" --phase start`
     - Research started:    `insight-flow log-activity "researching <topic>" --phase research-start`
     - Research complete:   `insight-flow log-activity "<1-line summary of findings>" --phase research-end`
     - Editing started:     `insight-flow log-activity "editing <file-or-area>" --phase edit-start`
     - Editing complete:    `insight-flow log-activity "<1-line summary of changes>" --phase edit-end`
     - Work done:           `insight-flow log-activity "completed <task-id>" --phase done`
     - Limit: 5–10 calls per task. Output summaries (research-end, edit-end) are shown verbatim in the activity feed.
     - Skip all calls if activityEngine.phaseMarkers is false.
     ```
   - `init/index.ts` strips the PHASE MARKERS block from per-project role-file copies when `activityEngine.phaseMarkers === false`.

7. **Smoke tests.**
   - `test/log-activity.test.mjs`: spawn `insight-flow log-activity "test" --phase start`; assert one JSONL line appended with `tool: "Phase"`. With `phaseMarkers: false`, assert nothing was written.
   - `test/log-activity-done.test.mjs`: spawn with `--phase done`; assert `action === "done"` in the written line.
   - Manual: full task lifecycle in a fresh Claude Code session; phase markers + classified commands appear newest-first in the aside panel; "idle" badge appears only after the done event.

8. **README.**
   - "Activity feed enrichment" section: free hooks, CLI subcommand, three config toggles, done-event convention, verbosity modes, master server endpoint.

## Verification

- `pnpm --dir packages/taskflow run typecheck && build && test` all pass.
- Manual A: fresh Claude Code session, run `/task-implement N99`. Aside panel shows phase markers newest-first (done at top after completion), classified commands, max 50 items, timestamps stay fresh on every WS tick.
- Manual B: `activityEngine.phaseMarkers: false` → re-init → role-file copies omit PHASE MARKERS, lifecycle produces no Phase entries.
- Manual C: `activityEngine.hookEnrichment: false` → re-init → only PostToolUse hook installed, no classified tool labels.
- Manual D: `activityEngine.verbosity: "milestones"` → only Phase + Skill events visible in panel.
- Manual E: master server `/api/activity/:projectName` returns last 3 events; overview card shows them + correct active/idle badge (idle only after done event).
- Manual F: collapse the aside panel, reload the page — panel remains collapsed.
- Token budget: < 500 tokens / task overhead with both halves enabled; 0 with both disabled.

## Notes

- Related: N17 (Socket.IO live updates) — new event types ride the existing channel unchanged.
- Related: N18 (activity panel UX) — aside panel replaces the popup introduced in N18; the "Waiting for Claude activity" empty-state still applies inside the aside.
- Related: N19 (notifications) — `cmdNotify` and `cmdLogActivity` share the fire-and-forget pattern; consider co-locating in `src/commands/fire-and-forget.ts`.
- Related: N20 (multi-project overview) — master server `/api/activity/:projectName` + active/idle badge are additive to N20's overview card.
- The `done` event as the sole idle trigger avoids false-idle from session gaps or network blips. Projects that never emit `done` (e.g. non-taskflow sessions) simply stay in the neutral (no badge) state.
- Token cost summary: hooks = 0 tokens/task; phase markers = ~150–300 tokens/task; total ceiling < 500 with both on; 0 with both off.
