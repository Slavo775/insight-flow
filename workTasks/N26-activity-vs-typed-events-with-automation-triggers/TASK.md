# N26 — activity vs typed events with automation triggers

**Type:** feat
**Priority:** high
**Created:** 2026-05-24
**Modified:** 2026-05-24

## Problem

The current `log-activity` + `--phase` mechanism conflates two distinct concerns: free-form narrative logging (useful but unstructured) and typed lifecycle signals (needed for automation). Because phase names are loose strings, nothing can reliably react to them — Claude ends up making imperative downstream calls (notifications, state updates) itself, burning tokens. Renaming and separating these two channels unlocks hook-based automation and eliminates that token waste.

## Goal

1. **Activity** remains a free-form, schema-less log — any message, any time, zero enforcement.
2. **Phase markers** are replaced by **Events** — a strict typed enum split into two tiers:
   - **Mandatory** (`start | done`): every agent MUST emit these; automation depends on them.
   - **Optional** (`active | idle | edit-start | edit-end | research-start | research-end | review-start | review-end | git-start | git-end`): emit only when the phase genuinely occurs; do not emit speculatively.
3. A new `log-event <type> [--task <id>] [--data <json>]` CLI command emits typed events to the activity store and stdout. **Each event type fires at most once per dedup window** (default 60 s, configurable) — the CLI silently drops a duplicate so the AI stays purely fire-and-forget with no guard logic.
4. Automation hooks in `taskflow.config.json` (and optionally Claude Code `settings.json`) react to event types — triggering notifications, state changes, push alerts — without Claude needing to call them.
5. Role files (`TASK_*_ROLE.md`, `TASKMASTER_ROLE.md`) updated: phase-markers section replaced by events section with strict types; Claude emits the event and stops — no further downstream calls.

## Scope

### In scope

- `packages/taskflow/src/commands/log-event.ts` — new command, strict Zod enum for event type; exports `MANDATORY_EVENT_TYPES` and `OPTIONAL_EVENT_TYPES` as named constants for use in role templates.
- `packages/taskflow/src/commands/log-activity.ts` — remove `--phase` flag; activity is now purely free-form.
- `packages/taskflow/src/types.ts` — add `TaskEvent` type (`type`, `taskId`, `timestamp`, `data?: Record<string,unknown>`).
- `packages/taskflow/src/schema/index.ts` — add `TaskEventSchema` with `eventTypeEnum`.
- `packages/taskflow/src/server/index.ts` + `dashboard.ts` — expose `/api/events` feed; render events distinctly from activity in the timeline.
- `packages/taskflow/templates/roles/*.tpl` — update phase-markers section → events section in all role templates.
- Root `TASK_*_ROLE.md` / `TASKMASTER*_ROLE.md` / `AGENT_*.md` — update inline (sync-role-templates will propagate to templates).
- `taskflow.config.json` schema — add optional `events.hooks` map: `{ [eventType]: string[] }` (shell commands the host runs on that event).
- `packages/taskflow/scripts/sync-role-templates.mjs` — no change needed if root files are updated first.

### Out of scope

- Changing how `log-activity` stores or displays free-form messages (beyond dropping `--phase`).
- Implementing the actual notification delivery (push, Slack, etc.) — that lives in the consumer's `taskflow.config.json` hooks.
- Claude Code `settings.json` hook wiring — that's consumer responsibility; we ship the event, not the reaction.
- Migrating existing activity log entries to the new event format.

## Implementation plan

1. **Define the event type enum and schema** (`packages/taskflow/src/types.ts`, `schema/index.ts`)
   - Add `MANDATORY_EVENT_TYPES = ['start','done'] as const`.
   - Add `OPTIONAL_EVENT_TYPES = ['active','idle','edit-start','edit-end','research-start','research-end','review-start','review-end','git-start','git-end'] as const`.
   - Derive `EVENT_TYPES = [...MANDATORY_EVENT_TYPES, ...OPTIONAL_EVENT_TYPES] as const` (12 total).
   - Add `TaskEventSchema = z.object({ type: z.enum(EVENT_TYPES), taskId: z.string().optional(), timestamp: z.string(), data: z.record(z.unknown()).optional() })`.
   - Export `TaskEvent`, `MandatoryEventType`, `OptionalEventType`, `EventType` inferred types.
   - The `mandatory` / `optional` split is metadata for role-file enforcement only — the CLI command itself accepts any valid type.

2. **Add `log-event` command with deduplication** (`packages/taskflow/src/commands/log-event.ts`)
   - Parse first positional arg as event type; validate against enum (exit 1 with usage on invalid).
   - Accept `--task <id>` (defaults to current task from master.json), `--data <json-string>`.
   - **Dedup check before write:** read existing `events.json`; if an event with the same `type` already exists with `timestamp` within `events.dedupWindowSeconds` (default: 60) of `Date.now()`, exit 0 silently — no write, no hook, no stdout output.
   - Write event to per-task `events.json` side file (same pattern as `reviews.json`).
   - Print one-line JSON to stdout: `{"event":"done","taskId":"N26","ts":"..."}` — consumed by hooks.
   - ~50 ms target; dedup read is the only extra I/O (events.json is small — append-only, never grows large per task).

3. **Strip `--phase` from `log-activity`** (`packages/taskflow/src/commands/log-activity.ts`)
   - Remove the `--phase` CLI option and any phase-related logic.
   - Activity entries keep their existing shape; no schema change needed.
   - Existing callers using `--phase` will get an "unknown option" error — documented as a breaking change in the release notes.

4. **Expose `/api/events` endpoint** (`packages/taskflow/src/server/index.ts`)
   - Read `workTasks/<id>/events.json` for the current task (or `?taskId=Nxx` param).
   - Return `{ events: TaskEvent[] }`.
   - Reuse the existing side-file hydration pattern from `reviews.json`.

5. **Render events in the dashboard timeline** (`packages/taskflow/src/server/dashboard.ts`)
   - In the timeline/activity section, show events with a distinct icon/badge per type.
   - `done` → green checkmark; `active`/`idle` → blue/grey dot; edit/research/review → existing phase colours.
   - Events are ordered by timestamp alongside free-form activity entries.

6. **Update `taskflow.config.json` schema** (`packages/taskflow/src/schema/index.ts` or config loader)
   - Add optional `events.hooks: Partial<Record<EventType, string[]>>`.
   - Add optional `events.dedupWindowSeconds: number` (default: 60). Set to 0 to disable deduplication entirely.
   - On `log-event`, after writing the event, iterate hooks for that type and spawn each as a detached shell child (fire-and-forget, no stdout capture).
   - Hooks only fire on a real write — deduplicated events (silent exit) never trigger hooks.
   - Example in README / config template:
     ```json
     "events": {
       "dedupWindowSeconds": 60,
       "hooks": {
         "done":  ["osascript -e 'display notification \"Task done\" with title \"insight-flow\"'"],
         "idle":  ["insight-flow push-notify --message 'Claude went idle'"]
       }
     }
     ```

7. **Update all role files** (root `TASK_*_ROLE.md`, `TASKMASTER_ROLE.md`, `AGENT_ENFORCEMENT.MD`, `TASK_GIT_ROLE.md`)
   - Replace `<!-- taskflow:phase-markers:start --> … <!-- taskflow:phase-markers:end -->` blocks.
   - New block title: `EVENTS`.
   - Command: `insight-flow log-event <type> [--task <id>]` (fire-and-forget, ~50 ms).
   - **Mandatory events** (MUST emit — every agent, every run):
     - `start` — first call, before any work.
     - `done` — last call, after all work including git if applicable.
   - **Optional events** (emit only when the phase genuinely occurs; skip otherwise):
     - `active | idle` — Claude session state transitions.
     - `edit-start | edit-end` — when editing source files.
     - `research-start | research-end` — when reading/searching to gather context.
     - `review-start | review-end` — when running a review phase.
     - `git-start | git-end` — **emitted by `/task-git` only** (see below).
   - **`/task-git` agent rules for git events:**
     - When called **standalone** (user invokes `/task-git` directly): mandatory `start`/`done` cover the whole run; `git-start`/`git-end` are redundant and MUST NOT be emitted.
     - When called **by another agent** (e.g. `/task-implement`, `/task-review-fix` triggers git at the end): emit `git-start` before the first git command and `git-end` after the PR/push completes, so the parent task's timeline shows the git phase as a distinct segment.
   - Rule: **Claude emits the event and stops.** Downstream actions (notifications, state, alerts) are the host automation's responsibility — Claude does not call them.
   - Token-saving note: mandatory pair = 2 calls minimum; optional events add only when real — zero speculative emissions. Replaces 3–5 imperative tool calls per phase.

8. **Run sync and rebuild**
   - `node packages/taskflow/scripts/sync-role-templates.mjs` to propagate root file changes to templates.
   - `pnpm build` — confirm TypeScript passes.
   - `pnpm play` — smoke-test `insight-flow log-event done --task N26`, verify event appears in `/api/events` and dashboard timeline.

## Verification

```bash
# 1. TypeScript passes
pnpm --dir packages/taskflow run build

# 2. log-event happy path
insight-flow log-event done --task N26
# → prints {"event":"done","taskId":"N26","ts":"<iso>"} to stdout

# 3. Invalid type rejected
insight-flow log-event foobar
# → exits 1, prints usage with valid types

# 4. --phase flag removed from log-activity
insight-flow log-activity "test" --phase start
# → exits 1: "unknown option: --phase"

# 5. Events appear in API
curl http://localhost:6006/api/events?taskId=N26
# → { "events": [{ "type": "done", "taskId": "N26", ... }] }

# 6. Hook fires (add a test hook to taskflow.config.json)
# "events": { "hooks": { "done": ["touch /tmp/insight-flow-done-hook-fired"] } }
insight-flow log-event done --task N26
ls /tmp/insight-flow-done-hook-fired   # must exist

# 7. Dedup: second call within window is silently dropped
insight-flow log-event start --task N26
insight-flow log-event start --task N26   # fired again within 60s
# events.json must contain exactly ONE start entry
# second call exits 0, no extra output, hook NOT fired twice

# 8. Dedup disabled: set dedupWindowSeconds=0, both calls write
# events.json contains two start entries

# 9. Dashboard timeline shows the event with correct badge
pnpm play   # open http://localhost:6006, navigate to N26 detail
```

## Notes

- **Token-saving rationale:** under the current model Claude must call `log-activity`, then potentially call a notification command, then confirm it worked — 3+ tool calls = ~900 tokens minimum. With typed events, Claude calls `log-event done` once and the host hook handles the rest. 5 events per task × 2 fewer tool calls each = ~1 000 tokens saved per task, scaling across all agents.
- **`active` / `idle` events** are particularly valuable: when Claude emits `log-event idle`, Claude Code's `PostToolUse` hook (configured in consumer's `settings.json`) can fire a push notification without Claude needing to do anything after the fact.
- **`git-start` / `git-end`** are scoped to `/task-git` and only meaningful when git runs as a sub-phase of a larger agent flow. In a standalone `/task-git` run, `start`/`done` already bracket the whole run — adding `git-start`/`git-end` would be redundant noise.
- **Mandatory vs optional** is a role-file enforcement rule, not a CLI constraint. The `log-event` command accepts all 12 types equally; the distinction is documented in the EVENTS block of each role file so agents know what's required and what's optional.
- **Deduplication design:** the 60 s default window covers the realistic "two agents start within a few seconds of each other" race without blocking legitimate re-runs hours apart. The AI needs zero guard logic — it calls `log-event start`, the CLI checks, and silently exits if a duplicate exists. Hooks only fire on real writes, so automation is never double-triggered. Setting `dedupWindowSeconds: 0` opts out entirely (useful for debugging or deliberate re-emission).
- **Breaking change:** `--phase` flag removal. Consumers using `insight-flow log-activity --phase` must migrate to `log-event`. Document in `CHANGELOG.md` under the next minor version bump.
- **`events.json` side file** follows the same append-only pattern as `reviews.json` — no locking issues, safe for concurrent writes.
- Related: N21 (richer activity feed), N23 (architecture diagrams — has notification hook in Diagram 3).
