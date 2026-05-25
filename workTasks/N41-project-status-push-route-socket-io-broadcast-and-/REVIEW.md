# N41 — Project status push: route, socket.io broadcast, and overview styles — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds a lightweight `POST /api/projects/:id/status` route to the master server, a `claudeStatus` field to `MasterProjectState`, and a fire-and-forget status push from the project server's activity event handler. Overview cards get green/yellow background tints that update in real-time via the existing socket.io `project-update` event. Changes are purely additive — no existing routes, schemas, or socket events are modified. Risk level: low.

## Checklist verification

- [x] `MasterProjectState` has `claudeStatus?` field — `types.ts` +1 line. Pass.
- [x] `registry.updateStatus()` mutates only `claudeStatus` + `lastSeenAt` — implementation confirmed. Pass.
- [x] `registry.update()` preserves `claudeStatus` via `{ claudeStatus: entry.state.claudeStatus, ...state }` spread. Pass.
- [x] `POST /api/projects/:id/status` route — 400 invalid status, 401 unknown id, 200 ok. Pass.
- [x] `io.emit("project-update", entry)` fires after successful status update. Pass.
- [x] CSS `.proj-card.status-active` and `.proj-card.status-permission` classes added. Pass.
- [x] `renderCard` applies `statusCls` from `s.claudeStatus`. Pass.
- [x] `pushStatusToMaster()` is `void fetch(...).catch(() => {})` — confirmed fire-and-forget. Pass.
- [x] `activity.onEvent` maps `active/agent-active → active`, `idle/agent-idle → idle`, `approval-required → permission-required`. Pass.
- [x] `pnpm --dir packages/insight-flow-master run build` — clean, 29.80 KB. Pass.
- [x] `pnpm --dir packages/taskflow run build` — clean. Pass.

## Non-blocking

1. **Duplicated valid-status list** — `VALID_STATUSES` in `registry.ts` and `validStatuses` inline in `server.ts` must stay in sync. If a fourth status is added later, one of them will be missed. Consider exporting `VALID_STATUSES` from `registry.ts` and importing it in `server.ts`. Not a bug today.

2. **`CLAUDE_STATUS_MAP` inside `startServer`** — defined as a `const` inside the function body. Since `startServer` is called once per process lifetime this has no runtime cost, but it reads as if it might change per call. Moving it to module level would make intent clearer. Non-blocking.

3. **No `standalone` guard on `/status` route** — the `/register` route returns 503 in standalone mode. The `/status` route doesn't, but since no project can ever register in standalone mode, the registry will always return false → 401. Behaviorally correct, but a 503 with a clear message would be more explicit. Non-blocking.

## Security & edge cases

- Status value passes through `String(parsed.status ?? "")` before validation — safe, no injection vector.
- The `id` segment from the URL is matched by `[^/]+` and passed directly to `registry.get()` (a Map lookup). No path traversal risk.
- No auth on the status route (same posture as the existing `/update` route) — acceptable for a local-network-only tool.

## Notes

- Real-time update path for `claudeStatus` works: `pushStatusToMaster` → master route → `registry.updateStatus` → `io.emit("project-update")` → browser `upsertProject(p)` → `renderCard(p)` re-renders card with new class. No additional wiring needed.
- `idle` status maps to no CSS class (neutral card) — correct; only `active` and `permission-required` have visual emphasis.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. Card backgrounds do not show the status tint. Screenshot shows "insight-flow" and "koktejl-new" with an "active" badge in the activity section but flat dark backgrounds — no green tint. `claudeStatus` on those registry entries is never being set. Root cause: the project server only calls `pushStatusToMaster` in `activity.onEvent`, which fires only when the activity engine is running AND an `active/idle/approval-required` event actually arrives after the project server restarts with new code. Projects already running before the rebuild never trigger the route, so `claudeStatus` stays `undefined` on the master. The overview card therefore always renders with no status class. Fix: on registration (or on the first full-state push after a project connects), the master should initialise `claudeStatus` to `"idle"` so the field is always present; and/or the project server should push an initial status immediately after `masterId` is obtained.

### Suggestions (non-blocking)

### Notes

- User's exact words: "i dont see the proper status as backgorund"
