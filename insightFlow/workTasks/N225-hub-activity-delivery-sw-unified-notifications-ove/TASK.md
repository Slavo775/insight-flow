# N225 — Hub activity delivery + SW-unified notifications overhaul

**Type:** fix
**Priority:** high
**Created:** 2026-07-12

## Problem

The N212–N222 hub changed **how** projects run (Start launches a dashboard on an assigned/free port, e.g. 6007) and **where** notifications should come from (the single-origin service worker), but the activity-delivery and notification paths weren't updated. Result (all observed live): (a) the live agent-status badge is stuck on **"idle"** and the lifecycle-event feed is **empty** because `log-event` POSTs to `http://127.0.0.1:${config.server.port}` (6006) while the dashboard runs on a different port; (b) even delivered, lifecycle events are rendered in **no** client tab (the "Recent Activity" tab is a task status-timeline, not an events feed) and the activity log is truncated on every server restart; (c) the Stop hook spams **`COMPLETED /unknown`** whenever a turn didn't start with a typed `/command`; (d) Chrome notifications only work with a project page open + foreground ("only once"), sounds are blocked by autoplay, and the "Claude is done" push never appears; the hub's SW-backed notifications only run on the *overview* page, not while viewing a project.

## Goal

1. **Port-correct delivery:** lifecycle events + agent-status reach the dashboard regardless of which port the hub started it on → the "idle" badge tracks reality and the lifecycle feed populates.
2. **Lifecycle events are visible** in a client tab (durable across restarts).
3. **No more `/unknown` spam** in the activity feed.
4. **Notifications fire from the service worker on any hub page** (overview *or* a proxied project) so a "Claude is done" (agent-finished) notification appears without needing the overview open — works while the hub is backgrounded/installed.
5. **Sounds work** (unlocked by a user gesture), and the previously-unnotified statuses (`done`/`fixed`/`changes-implemented`) are covered.
6. Build, typecheck, tests, and a review are green.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/log-event.ts` — POST to the dashboard's **actual** port, not `config.server.port`.
- `packages/taskflow/src/dashboard/server/index.ts` — have the dashboard **advertise its real port** (a runtime pointer `log-event` can read), and stop the activity engine truncating the log on (re)start (`dashboard/server/activity.ts`) or make the feed durable.
- `packages/taskflow/src/dashboard/client/` (`App.tsx`, `useDashboardStream.ts`, `store.ts`, `ui.tsx`/`activity.ts`) — **render the lifecycle `event` SSE frames** in a tab; ensure the agent-status badge is driven by the delivered status.
- `packages/taskflow/src/agents/activity-hook.ts` — stop emitting `Skill/completed skill:"unknown"`; only emit a completed-skill when one was captured (and improve capture where feasible).
- `packages/taskflow/src/master/server.ts` (proxy shell injection) + `packages/taskflow/src/master/overview.ts` — **route notifications through the hub SW from every hub page**: inject/share the hub notification logic (the `/events` SSE listener + `showHubNotification` via `swReg.showNotification` + sounds) into the proxied project pages, so notifications fire wherever you are in the hub; register the SW on those pages.
- `packages/taskflow/src/agents/notify-hook.ts` + `master/overview.ts` `NOTIF_WATCHED` + the settings toggle id lists — add `done`/`fixed`/`changes-implemented`; make the agent-finished ("Claude is done") notification actually fire.
- Audio unlock on a user gesture (client + hub).
- Tests in `packages/taskflow/test/`.

### Out of scope

- **Web Push** / notifications when the browser is **fully closed** — explicitly deferred (the N216 decision was SW + Notifications API only). This task delivers "works while the hub is open/installed & backgrounded." Fully-closed push is a possible follow-up.
- Redesigning the activity engine's data model beyond the truncation fix.
- The task-workflow "done" notification (the user meant **agent-finished** "done"); adding the missing *statuses* to the watch-lists is in scope, but the primary notification target is agent-done.
- The N223/N224 work (trusted hosts / docs) — separate tasks.

## Implementation plan

1. **Dashboard advertises its port.** On `startServer`, write the actual `serverPort` to a small runtime pointer the CLI can find for this project (e.g. `~/.insight-flow/ports/<projectId>.json` or a file in the project dir keyed by cwd). Clean it up on shutdown / staleness.
2. **`log-event` targets the real port.** Read that pointer (fallback: `config.server.port`) before `postToLogEvents`. Verify the agent-status badge + lifecycle feed now update on the hub-started (6007) dashboard.
3. **Render lifecycle events.** Add a client handler for the `event` SSE frame (`useDashboardStream.ts`) and a durable list in the store; surface it in a tab (repurpose/rename "Recent Activity" to a real events feed, or add an "Events" tab). Stop `activity.ts` truncating the JSONL on boot (or seed the feed from the persisted store).
4. **Kill `/unknown`.** In `activity-hook.ts` `DONE_HOOK_SCRIPT`, skip the `Skill/completed` row when `.last-skill` is absent (no spurious `unknown`); optionally record the active skill from the Skill-tool path so completed rows carry the real name.
5. **SW-unified notifications.** Extract the hub notification logic into a script the master injects into **both** the overview and every proxied `/project/<id>/` shell (register `/sw.js`, open `/events`, fire `swReg.showNotification`, play sounds, honor settings/mutes). So a "Claude is done" notification appears from any hub page, backgrounded. Retire the project page's redundant foreground `new Notification` when running under the hub.
6. **Agent-done + missing statuses.** Ensure the agent-finished signal fires a notification; add `done`/`fixed`/`changes-implemented` to `NOTIF_WATCHED` + the settings id lists + `notify-hook.ts` case list; handle the `insight-flow current`-empty early-exit.
7. **Audio unlock.** Prime the audio (a one-time gesture — e.g. on the first click / the permission prompt) so `Audio.play()` isn't autoplay-blocked.
8. **Tests + live verify** across the hub-proxy path and a direct project.

## Verification

- Start a project via the hub (non-6006 port). The dashboard's **agent-status badge tracks active/idle/permission**, and the **lifecycle events feed populates** (verified on the hub-started port).
- No `COMPLETED /unknown` rows appear for normal turns.
- With the hub tab **backgrounded** (overview or inside a project), finishing a Claude turn fires a **"done" notification via the SW** (+ sound after a prior gesture).
- `cd packages/taskflow && npx tsc --noEmit && npm test` green (+ new tests: port-pointer/log-event delivery, event-frame render, no-unknown, watch-list additions).

## Notes

- Root-cause map from the 2026-07-12 investigation (file:line refs in ANALYSIS.md): `cli/commands/log-event.ts` (port), `dashboard/server/activity.ts:24-27` (truncation), `dashboard/client/useDashboardStream.ts:46-108` (no `event` handler) + `ui.tsx:161-184` (Recent Activity = timeline), `agents/activity-hook.ts:190-196` (`unknown`), `master/overview.ts:343,639-691` + `master/server.ts:62-84,375-402` (SW/notification split), `agents/notify-hook.ts:41-54` + `core/types.ts:12,248` (the two "done"s).
- Surfaced by the hub epic; belongs on `dashboard-improvements` to ship with 2.4.0 (sequence after N223/N224 or in parallel — no hard dependency, but heavy on `master/server.ts` which N223 also touches → coordinate).
- Big diff spanning CLI + hook + client + server + master — expect a thorough review (the SW-notification routing is the architectural piece).
