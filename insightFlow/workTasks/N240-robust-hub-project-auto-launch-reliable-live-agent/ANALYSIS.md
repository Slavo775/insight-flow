# N240 — Analysis (pre-taskmaster audit trail)

Produced by `/task-analyze` before handoff.

## Problem framing

Reported: hub notifications never fire on real agent events (Claude finished / needs permission). Established during the session that the notifier itself is fine — a manual `swReg.showNotification(...)` shows a banner, permission is `granted`, the SW is registered, and the served `/hub-notify.js` is the new 2.8.0 build. So the break is upstream of delivery.

## How the chain should work (verified by reading code)

```
Claude hook → `insight-flow log-event`
   → (a) appendFileSync(activity log)
   → (b) POST http://127.0.0.1:<livePort>/log/events   (livePort from the port-pointer file)
dashboard EventStore → deriveStatus (N238 state machine) → pushStatusToMaster on transition
master registry.updateStatus → broadcast "project-update" over /events
hub-notify.js onUpdate → notify() on active→done / →permission
```

- `log-event.ts:275` — `livePort = readServerPortPointer(resolveProjectRoot()) ?? config.server.port`. Dynamic-port handling **exists**.
- `global-config.ts:63` — `readServerPortPointer` reads `~/.insight-flow/ports/<sha1(root)>.json`, returns null if the writer pid is dead.
- Verified live: insight-flow's pointer = `{port:6007, pid:41962 (alive)}`. So hooks post to the right dashboard. **The earlier "port mismatch" theory was wrong** and is retracted.

## Findings

1. **Confirmed bug — master crashes on a missing project path.** `master/server.ts:1372` `spawn(process.execPath, [selfCli, "ui", "--port", port], { cwd: entry.path, detached:true })`. With a missing `cwd`, `spawn` emits an unhandled `error` (`ENOENT`) → master process dies. Reproduced today from the stale `hub.json` entry `ring-cms-extensions → /Users/ssedlak/Documents/ring-cms-extensions/ring-cms-extensions` (path did not exist). Master log showed the `ENOENT` on `ui --port 6012` then `Node.js v22.13.1` (process exit).

2. **Suspected — live status not reaching master.** Master `/api/hub/projects` showed insight-flow `claudeStatus=-` (null) while the project's own dashboard (`GET :6007/log/status`) reported `status=done` with 112 events. So the derived status is not landing at the master. NOT cleanly reproduced — the live state was polluted by a mid-session kill/respawn of all dashboards + master. Must reproduce from clean before scoping a fix.

## Options considered

- **Rewrite the transport / notification model** — rejected. SSE + hooks + the N238 engine are correct; delivery is proven.
- **One big task (crash + notify path)** vs **split** — analyst leaned split (A confirmed, B needs repro). Taskmaster created one phased task: Phase 1 (crash, confirmed) is do-now; Phase 2 (notify path) is reproduce-then-fix, so no speculative changes from a dirty state.
- **Blame the port pointer** — rejected after verifying the pointer is correct and alive.

## Decision

One `fix` task (N240), phased:
- Phase 1: make the auto-launch crash-proof (skip missing paths, handle `spawn` error, prune stale `hub.json`). Confirmed, high value (took down the hub).
- Phase 2: reproduce the status gap cleanly, then fix the minimal proven cause.

## Open questions

- Is the Phase-2 gap a real code bug or purely the mid-session restart mess? (Resolve by clean reproduction first.)
- Should the auto-launch on hub-assigned ports be reconsidered at all, or is the port-pointer reconciliation sufficient? (Likely sufficient — pointer verified working.)
- Is a small "why-no-notification" diagnostic worth adding (per-project claudeStatus + last-push time)?

## Sources

- `master/server.ts` (spawn/auto-launch ~1364-1406, `/start`), `master/registry.ts` (`updateStatus`).
- `dashboard/server/index.ts` (`pushStatusToMaster` ~645/1521, `setupMasterConnection`, `writeServerPortPointer`).
- `cli/commands/log-event.ts` (file append + POST to livePort), `core/global-config.ts` (port pointer).
- Live: `~/.insight-flow/ports/*` pointers, `~/.insight-flow/master-restart.log` (the crash), `/api/hub/projects`, `:6007/log/status`.

## Handoff brief

Fix, high priority. Phase 1: guard the master's project auto-launch so a missing/failed spawn skips the project and logs instead of crashing the hub; prune stale `hub.json` entries. Phase 2: reproduce the "dashboard derives status but master shows `claude=-`" gap cleanly, then fix the minimal cause so hub notifications fire on real `active→done` / `→permission`. Do not touch the N238 notifier/engine unless the repro points there.
