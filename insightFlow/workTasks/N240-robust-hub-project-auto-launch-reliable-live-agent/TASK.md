# N240 — Robust hub project auto-launch + reliable live agent-status to master (notifications fire)

**Type:** fix
**Priority:** high
**Created:** 2026-07-15

## Problem

Hub notifications do not fire on real agent events ("Claude finished" / "needs permission"), even though the N238 notifier is correct and delivery works (a manual `showNotification` shows a banner). A `/task-analyze` investigation found the break is upstream of the notifier, in the master's project handling:

1. **Confirmed bug:** the master's bulk auto-launch crashes the whole hub. It does `spawn("insight-flow ui", { cwd: project.path })` for every registered project; if a path is missing (a stale `hub.json` entry), `spawn` emits an **unhandled** `ENOENT` error and the master process dies.
2. **Suspected (not yet reproduced):** live `claudeStatus` from a running project does not reach the master. Observed: the project's own dashboard reports `status=done` locally, but the master registry shows `claudeStatus=-` (null) for the same project — so the hub has no transition to notify about. This is entangled with a mid-session server restart, so it must be reproduced cleanly before its fix is scoped.

## Goal

1. The master **never crashes** because a registered project path is missing or its dashboard spawn fails — it skips that project and logs a warning.
2. A stale/dead `hub.json` entry (path gone) is pruned or ignored, not fatal.
3. Live agent status (`active → done`, `→ awaiting-permission`) from a running project **reliably reaches the master**, so `hub-notify.js` fires on real agent events.
4. The status path is **observable** — it is possible to tell where a status stops (dashboard → push → master → SSE → hub-notify).

## Scope

### In scope

- **Phase 1 (confirmed):** `packages/taskflow/src/master/server.ts` — the auto-launch `spawn(...)` (around line 1372) and any startup bulk-launch loop. Attach an `error` handler to the child, wrap the spawn, skip a project whose `cwd` path does not exist (`existsSync`), and log a warning. Prune/ignore stale `hub.json` entries whose `path` is missing.
- **Phase 2 (reproduce-then-fix):** the dashboard → master status push. `packages/taskflow/src/dashboard/server/index.ts` (`pushStatusToMaster` at startup ~line 645 and on transition ~line 1521; `setupMasterConnection`) and `packages/taskflow/src/master/registry.ts` (`updateStatus`). Only change what a clean reproduction proves is broken.

### Out of scope

- The N238 notification **code** (`hub-notify.ts`, `status-machine.ts`) — verified correct; do not touch unless the repro points here.
- Service worker / notification permission (already working) and the composer publish-fix (separate).
- The port-pointer mechanism — verified working (the earlier "port mismatch" theory was wrong).

## Implementation plan

1. **Guard the auto-launch spawn (Phase 1).** In `master/server.ts`, before spawning skip a project whose `path` doesn't exist (`existsSync`); attach `child.on("error", ...)` so a spawn failure logs and is swallowed, never crashing the master. Apply to both the on-demand `/start` path and any startup bulk-launch.
2. **Handle stale hub.json entries.** On read (`readHubRegistry`) or launch, drop/ignore entries whose `path` is missing; optionally log which were skipped.
3. **Clean reproduction of the status gap (Phase 2, first).** Fresh master + one project started normally (its own dashboard) + hub tab open; trigger a real `active → done`. Trace at each hop where `claudeStatus` stops (dashboard `/log/status`, the master `POST /api/projects/:id/status`, `registry.updateStatus`, `/events` frame, hub-notify `onUpdate`).
4. **Fix the proven gap (Phase 2).** Based on the trace, fix why the push doesn't land for a running project (e.g. startup push ordering vs registration, or the auto-launched dashboard not pushing). Keep it minimal.
5. **Add a diagnostic (optional, if cheap).** A one-line way to see the master's per-project `claudeStatus` + last-push time, so "why no notification" is answerable without a deep trace.

## Verification

- Kill the master, add a bogus `hub.json` entry with a non-existent `path`, restart → master **stays up**, logs a skip, serves the overview. (Phase 1)
- With one project running normally and the hub open: let Claude finish a turn → the master's `claudeStatus` for that project goes `active → done` and a **"Claude finished" banner fires**. Same for a permission prompt → `awaiting-permission` banner. (Phase 2)
- `pnpm --dir packages/taskflow test` stays green; add a unit test for the spawn-guard / stale-entry skip.

## Notes

- Outcome of `/task-analyze`; full trace in this folder's `ANALYSIS.md`.
- Related: N238 (the notifier + engine, correct), N212–N217 (hub single-origin), N220/N228 (project start + self-heal).
- Today's live state is polluted by a mid-session restart — do NOT scope Phase 2 from it; reproduce cleanly first.
- The crash surfaced from a real stale entry: `ring-cms-extensions` → `/Users/ssedlak/Documents/ring-cms-extensions/ring-cms-extensions` (already removed from `hub.json`, backup kept).
