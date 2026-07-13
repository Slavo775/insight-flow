# N225 — Hub activity delivery + SW-unified notifications overhaul — Analysis

**Created:** 2026-07-12
**Author:** task-analyze

## Problem framing

User reported (during hub testing) that the dashboard's activity + notifications look broken: agent-status stuck "idle", the events feed empty, `COMPLETED /unknown` spam, and Chrome notifications/sounds not firing (esp. no "Claude is done"). A deep code investigation (background agent, 2026-07-12) traced every symptom to the **hub epic changing two things without updating the dependent paths**: (1) projects now run on **assigned/free ports** (not `config.server.port`), and (2) notifications were meant to move to the **single-origin service worker** but the SW-backed path only lives on the overview page. So the underlying cause is a *delivery + origin* mismatch, not the activity engine or the Notifications API themselves.

Distinct root causes:
- **Wrong-port event delivery** — `log-event` → `config.server.port` (6006) while the dashboard runs on 6007 (`cli/commands/log-event.ts:140-147,268`). Starves the event store → stuck-idle badge + empty lifecycle notifications.
- **Lifecycle events rendered nowhere** — client never handles the `event` SSE frame (`useDashboardStream.ts:46-108`); "Recent Activity" is a task-status Timeline (`ui.tsx:161-184`); the activity JSONL is truncated on server boot (`dashboard/server/activity.ts:24-27`).
- **`/unknown`** — the Stop hook hardcodes `skill:"unknown"` when no typed `/command` preceded it (`agents/activity-hook.ts:190-196`); Skill-tool invocations aren't captured.
- **Notification split** — page-level `new Notification` (foreground-only) on the project page vs SW-backed `showHubNotification` on the overview only (`master/overview.ts:343,639-691`; `master/server.ts:62-84,375-402`); autoplay blocks sound.
- **"done"** — two different "done" (`core/types.ts:12,248`): agent-idle vs workflow. User means **agent-finished**; it's blocked by the same path. Workflow `done`/`fixed`/`changes-implemented` also missing from all watch-lists (`overview.ts:343`, `notify-hook.ts:41-54`).

## Goal

Restore correct activity/agent-status delivery regardless of hub-assigned port, render lifecycle events, kill `/unknown`, and make notifications fire from the SW on any hub page (backgrounded/installed) — including "Claude is done" — with working sound. Explicitly no Web Push (background-while-open only).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — One overhaul task: port-delivery + events-render + /unknown + SW-unified notifications + watch-lists | Fixes the whole coherent subsystem at once; matches how the symptoms interlock | Large diff across CLI/hook/client/server/master; heavier review | L |
| B — Split into 3–4 tasks (delivery regression / events UX / notifications architecture / small hook fixes) | Smaller reviews; parallelizable | The pieces interlock (port bug ↔ notifications ↔ badge); more coordination + tracker churn | M×n |
| C — Only the port regression now, triage the rest | Fastest partial relief | Leaves /unknown, done-push, and the SW-notification gap unfixed — the user asked for all of it | S |
| D — Add Web Push for fully-closed notifications | Strongest notification story | Reverses the N216 decision; server/push-service scope; overkill now | XL |

## Decision

- Chosen option: **A** (confirmed with the user via AskUserQuestion — "One big activity+notifications overhaul task"; and "agent-finished" as the target 'done'; and the SW-from-any-page intent — "we wanted the service worker to not rely on an open project"). No Web Push (D deferred, confirmed).
- Rationale: the symptoms share roots (the port bug drives both the stuck badge and the missing project-side notifications; the notification path is one origin/SW story), so fixing them together avoids half-states and re-review churn. B fragments an interlocked subsystem; C under-delivers; D is out of the agreed design.

## Open questions

- `[blocking]` Port-advertisement mechanism: a per-project runtime pointer (`~/.insight-flow/ports/<projectId>.json`) vs writing into the project dir. Must be robust to multiple projects + stale entries. Implementer to pick + justify.
- `[non-blocking]` "Events" surfacing: repurpose the "Recent Activity" tab into a real lifecycle-events feed, or add a distinct "Events" tab? Lean toward a real events feed since that's the user's expectation.
- `[non-blocking]` Skill-tool capture: can the hook see Skill-tool invocations (not just typed `/command`)? If not cheaply, at minimum stop emitting `unknown`.
- `[non-blocking]` Backgrounded-notification reality without Web Push: needs a hub page/PWA alive holding the `/events` SSE. Document the limitation; fully-closed is a follow-up.
- `[non-blocking]` Coordinate with N223 (both edit `master/server.ts`); sequence or rebase to avoid conflicts.

## Sources

- Root-cause investigation (analyzer-discovered, trust: high, 2026-07-12): background code trace across `dashboard/client/{App,useDashboardStream,store,ui,activity,notifications,base}.tsx/ts`, `dashboard/server/{index,activity,event-stream}.ts`, `cli/commands/log-event.ts`, `agents/{activity-hook,notify-hook}.ts`, `master/{overview,server}.ts`, `core/types.ts`.
- Live evidence (human-supplied, high): screenshots of "Agent Activity [idle]" + "COMPLETED /unknown"; on-disk `.taskflow-activity.jsonl` showing `Skill completed skill:"unknown"`; the running dashboard on 6007 vs `config.server.port` 6006.
- No external URLs.

## Handoff brief

Title: Hub activity delivery + SW-unified notifications overhaul · type: fix · priority: high. Fix the hub-introduced breakage across the activity + notification subsystem: `log-event` must POST to the dashboard's real (hub-assigned) port so the agent-status badge and lifecycle feed work; render lifecycle `event` SSE frames in a tab (durably); stop the Stop-hook `/unknown` spam; route notifications through the hub service worker from every hub page (overview + proxied project) so "Claude is done" fires while backgrounded/installed, with working sound; add the missing statuses to the watch-lists. No Web Push (background-while-open only). One coherent overhaul on `dashboard-improvements`; coordinate with N223 on `master/server.ts`.
