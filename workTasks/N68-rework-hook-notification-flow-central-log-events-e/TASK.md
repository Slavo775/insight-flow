# N68 — rework hook notification flow: central /log/events endpoint with status derivation

**Type:** rework
**Priority:** medium
**Created:** 2026-05-28
**Modified:** 2026-05-28

## Problem

Hook notifications today are file-driven and conflate two concerns: OS toasts and dashboard state. Status derivation (active / awaiting-permission / done) happens implicitly via file scrapes, ordering is unreliable, and the frontend has no clean signal for "status changed → notify the user." Result: stale/duplicated notifications and no canonical project status that the master overview can consume.

## Goal

1. Hooks fan out into two clean responsibilities: OS notify (only for `Stop` + `Notification`) and event logging (every hook).
2. New `POST /log/events` endpoint on the project HTTP server owns event ingestion, persists a backup, derives status, and broadcasts via WebSocket.
3. Status model is explicit and timestamp-ordered: `active`, `awaiting-permission`, `idle`, `done` — derived from the latest event by `timestamp`.
4. Frontend reacts to `status` WebSocket messages: fires a browser notification (config + tab-blur gated) and plays a sound only on `→ done` / `→ awaiting-permission`.
5. Master overview receives status pushes from the project server (which holds its UUID); hooks never call master directly.

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — add `POST /log/events`, status-derivation in-memory store, WebSocket broadcast for `event` + `status`, master forwarder.
- `packages/taskflow/templates/hooks/**` (and any installed-hook shell scripts under `.claude/hooks/` scaffolded by `insight-flow init`) — one entry-point per hook event:
  1. append `{id, timestamp, type, payload}` to backup file,
  2. POST to `/log/events`,
  3. if `Stop` or `Notification` → invoke OS notify path.
- OS notify path: existing CLI command stays; only the `Stop` and `Notification`-with-permission-wording hooks invoke it.
- `packages/taskflow/src/server/dashboard.ts` (and any dashboard JS module): subscribe to `status` WebSocket message, gate browser notification by `document.hasFocus()` + per-browser localStorage toggle, play sound only on `→ done` / `→ awaiting-permission`.
- Backup file format + location: rolling `workTasks/.events/<YYYY-MM-DD>.jsonl` (raw hook events). Per-task `events.json` files (already written elsewhere) are out of scope.
- Schema additions in `packages/taskflow/src/schema/` for the event payload and status enum.

### Out of scope

- Per-task `events.json` enrichment writers (N67 / earlier work) — leave alone.
- Master server schema changes beyond accepting the existing status-push shape with `{projectUuid, status, latestEventId, timestamp}`.
- Sound file changes (already settled in N62).
- Notification permission UX flow beyond a single toggle + `Notification.requestPermission()` call.
- Crash-recovery / idle-timeout (no event in N minutes → idle) — punted; status sticks until next event.

## Implementation plan

1. **Define event + status types** in `packages/taskflow/src/types.ts` and Zod schemas in `packages/taskflow/src/schema/`.
   - `HookEvent { id: string (uuid), timestamp: ISO8601, type: "Stop" | "Notification" | "PreToolUse" | "PostToolUse" | "SessionStart" | "UserPromptSubmit" | ... , payload: object }`.
   - `ProjectStatus = "active" | "awaiting-permission" | "idle" | "done"`.
   - Status derivation rule:
     - `Stop` → `done`
     - `Notification` with `payload.message` matching permission wording (e.g. `/permission/i`) → `awaiting-permission`
     - `Notification` with idle wording → `idle`
     - any other event → `active`

2. **Server: `POST /log/events`** in `packages/taskflow/src/server/index.ts`.
   - Validate body via the new Zod schema.
   - Insert into in-memory ring buffer (last N=200), sorted by `timestamp`.
   - Recompute status from latest-by-timestamp event. Compare to previous status.
   - Always broadcast `{ kind: "event", event }` on WebSocket.
   - If status changed: also broadcast `{ kind: "status", from, to, at }`.
   - On status change, fire-and-forget POST to master `/overview/status` with project UUID from `taskflow.config.json`.
   - Return `{ ok: true, status }`.

3. **Hook entry-point script** at `packages/taskflow/templates/hooks/log-event.sh` (replaces / consolidates existing scripts):
   - Read stdin JSON from Claude Code.
   - Compute `id` (uuid) + `timestamp` (ISO).
   - Append line to `$CLAUDE_PROJECT_DIR/workTasks/.events/$(date +%Y-%m-%d).jsonl`.
   - `curl -s -X POST` to `http://localhost:<port>/log/events` (fail-silent; server-down must not break Claude).
   - If hook type is `Stop` or `Notification` → also invoke OS-notify CLI command.
   - All three steps run regardless of each other's success.

4. **Hook installation** in `insight-flow init` (and `packages/taskflow/src/commands/init.ts`) — point all hooks at the new entry-point script. Remove the old split scripts that wrote per-task `events.json` *if* they exist and are superseded; otherwise leave them and just add the new one alongside.

5. **Frontend wiring** in `packages/taskflow/src/server/dashboard.ts`:
   - Parse new `status` WebSocket message.
   - On `→ done` or `→ awaiting-permission`:
     - If `Notification.permission === "granted"` and localStorage toggle is on and `!document.hasFocus()` → `new Notification(title, body)`.
     - Always play the existing MP3 (sound logic unchanged from N62).
   - On other status transitions: no notification, no sound.
   - Add a "Browser notifications" toggle to dashboard settings (localStorage-backed) + a "Request permission" button that calls `Notification.requestPermission()`.

6. **Master forwarder** — extend the existing project→master push (or add it) to send the new status payload. Project UUID lookup stays where it is today.

7. **Cleanup** — remove dead notification code paths superseded by the new flow; keep the OS-notify CLI command itself, only its trigger points change.

8. **Upgrade-migration strategy for installed consumer projects.** When users `npm update insight-flow` / `pnpm up insight-flow`, hook scripts that were copied into `.claude/hooks/` at `init` time would otherwise stay frozen at the old version.
   - **Preferred: thin-wrapper hooks.** Each hook script shipped by `insight-flow init` is a 1–2 line delegator that reads stdin and execs `insight-flow hook <event-type>` (a new internal CLI subcommand). All logic — backup write, POST to `/log/events`, OS-notify decision — lives inside the npm package. Package updates flow through automatically; user never needs to re-run `init`.
   - **Migration command for existing installs that have the old fat scripts:** `insight-flow init --force` (already exists) overwrites scaffolded hook files. Add a `--hooks-only` flag, or a dedicated `insight-flow migrate-hooks` subcommand, that rewrites only `.claude/hooks/*` + the `hooks` block in `.claude/settings.json` without touching other init-scaffolded files (role prompts, taskflow.config.json, etc.).
   - **Versioning marker:** add a `taskflow.hooksVersion` field to `taskflow.config.json` and a startup check in `insight-flow ui` / any CLI command that warns when installed hooks are older than the package's bundled version. Print one-line guidance to run the migration command.
   - **Backward-compat note:** old fat hook scripts can keep working in parallel — the server's `/log/events` endpoint is additive. Don't break users who haven't migrated yet.

## Verification

- `pnpm --dir packages/taskflow run build` — clean.
- `pnpm --dir packages/taskflow test` — existing tests pass; add a unit test for status derivation (`derive(events) → status`) covering the four buckets.
- Manual: run `pnpm play`, open dashboard, send a fake `POST /log/events` with `Stop`/`Notification`/`PreToolUse` via curl, observe:
  - `event` WebSocket frame every time.
  - `status` WebSocket frame only on transitions.
  - Browser notification fires only when tab is unfocused, toggle is on, and transition is `→ done` / `→ awaiting-permission`.
  - Sound plays for the same two transitions; not for `active`/`idle`.
- Stop the master server briefly, fire events; project server stays responsive (forwarder is fire-and-forget).

## Notes

- Continues the hook-path work from N67 (which fixed `CLAUDE_PROJECT_DIR` plumbing).
- Open decisions baked as defaults — flag during implementation if any need to change:
  - **Backup file scope:** rolling daily `workTasks/.events/<date>.jsonl` (single global log per project, not per-task).
  - **Notify transitions:** only `→ done` and `→ awaiting-permission` fire browser notification + sound.
  - **Config scope:** browser notification toggle lives in localStorage (per-browser, per-device).
  - **Crash recovery:** none for now — status sticks until next event.
- Wording match for permission vs idle in `Notification` hook payload: start with case-insensitive `/permission/` regex against `payload.message`; revisit if it misclassifies.
- **Hook upgrade path is a first-class concern**, not a follow-up. Without it, every future hook change requires every consumer to manually re-run `insight-flow init`. The thin-wrapper approach in step 8 is the design that makes this rework forward-compatible — any subsequent hook logic change ships as a package update, no consumer action required. Treat it as load-bearing for N68.
