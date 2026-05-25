# N41 — Project status push: route, socket.io broadcast, and overview styles

**Type:** feat
**Priority:** high
**Created:** 2026-05-25

## Problem

The overview shows project cards with no indication of the current Claude session state (active / idle / permission-required). The master server has no way to receive a lightweight status ping — only the heavyweight full-state `/api/projects/:id/update` route exists. Project cards render with a static background regardless of what Claude is doing.

## Goal

1. Master server exposes `POST /api/projects/:id/status` accepting `{ status: "active" | "idle" | "permission-required" }` and emits `project-update` via socket.io so overview reflects it immediately.
2. `MasterProjectState` carries a `claudeStatus` field that persists across full-state pushes.
3. Project server calls the new status route fire-and-forget whenever a `active`, `idle`, or `permission-required` activity event fires — no `await`, no error surfacing.
4. Overview project card background reflects `claudeStatus`: green tint for `active`, yellow/orange tint for `permission-required`, neutral default for `idle` / unknown.

## Scope

### In scope

- `packages/insight-flow-master/src/types.ts` — add `claudeStatus?: "active" | "idle" | "permission-required"` to `MasterProjectState`.
- `packages/insight-flow-master/src/registry.ts` — add `updateStatus(id: string, status: string): boolean` that mutates only `entry.state.claudeStatus` and touches `lastSeenAt`.
- `packages/insight-flow-master/src/server.ts` — add `POST /api/projects/:id/status` route; validate status value; call `registry.updateStatus`; emit `io.emit("project-update", entry)`; return `{ ok: true }`. Return `400` for invalid status, `401` for unknown id.
- `packages/insight-flow-master/src/overview.ts` — add CSS vars/classes for status backgrounds; update `renderCard` to set a `data-claude-status` attribute and apply background class; listen to `project-update` socket event and re-render the affected card (already done via `upsertProject`).
- `packages/taskflow/src/server/index.ts` — add `pushStatusToMaster(masterUrl: string, id: string, status: string): void` (fire-and-forget: `void fetch(...)`); call it inside the `activity.onEvent` handler when `event.type` or `event.action` is `"active"`, `"idle"`, or `"permission-required"`.

### Out of scope

- Changes to `buildProjectState` / full-state push logic — the `claudeStatus` field must survive a full-state push unchanged (registry's `update()` should preserve it).
- Modifying `log-event` command — it already emits the events; the server intercepts them.
- Any change to existing socket events or dashboard (project-server side).

## Implementation plan

1. **`types.ts` — add claudeStatus field**
   - Add `claudeStatus?: "active" | "idle" | "permission-required"` to `MasterProjectState` interface.

2. **`registry.ts` — add updateStatus helper**
   - Add `export function updateStatus(id: string, status: string): boolean`.
   - Validate `status` is one of `active | idle | permission-required`; return `false` if not.
   - Set `entry.state.claudeStatus = status as ...` and `entry.lastSeenAt = new Date().toISOString()`; return `true`.
   - Also ensure `registry.update()` (full-state push) preserves any existing `claudeStatus` if the incoming state does not include it — update `update()` to: `entry.state = { claudeStatus: entry.state.claudeStatus, ...state }`.

3. **`server.ts` — add POST /api/projects/:id/status route**
   - After the existing `updateMatch` block (line ~95), add a `statusMatch` regex block: `/^\/api\/projects\/([^/]+)\/status$/`.
   - Read body, parse `{ status }`, validate against `["active","idle","permission-required"]`.
   - Call `registry.updateStatus(id, status)` — on `false` return `401`.
   - Get entry via `registry.getById(id)` and emit `io.emit("project-update", entry)`.
   - Respond `200 { ok: true }`.

4. **`overview.ts` — CSS for status backgrounds**
   - In `CSS` string, add three classes:
     ```css
     .proj-card.status-active { border-color: rgba(34,197,94,0.35); background: linear-gradient(135deg,#141414 80%,rgba(34,197,94,0.08)); }
     .proj-card.status-permission { border-color: rgba(234,179,8,0.35); background: linear-gradient(135deg,#141414 80%,rgba(234,179,8,0.08)); }
     ```
   - In `renderCard` JS function, derive `statusCls` from `p.state.claudeStatus`:
     - `"active"` → `"status-active"`, `"permission-required"` → `"status-permission"`, else `""`.
   - Append `statusCls` to the `proj-card` div's class attribute.

5. **`server/index.ts` — fire-and-forget status push**
   - Add `function pushStatusToMaster(masterUrl: string, id: string, status: string): void` that does: `void fetch(\`${masterUrl}/api/projects/${id}/status\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }), signal: AbortSignal.timeout(2000) }).catch(() => {})`.
   - Inside the `activity.onEvent` handler (around line 581), after emitting to socket, check: if `event.type === "active" || event.type === "idle" || event.type === "permission-required"` (or `event.action` for the same values) and `masterId` is set, call `pushStatusToMaster(masterUrl, masterId, event.type ?? event.action)`.

## Verification

- Start master: `pnpm --dir packages/insight-flow-master run build && node packages/insight-flow-master/dist/index.js`.
- Register a project: `curl -s -X POST http://localhost:6100/api/register -H 'Content-Type: application/json' -d '{"label":"test","url":"http://localhost:6006","projectId":"test"}'` — note the returned `id`.
- Push `active` status: `curl -s -X POST http://localhost:6100/api/projects/<id>/status -H 'Content-Type: application/json' -d '{"status":"active"}'` → `{"ok":true}`.
- Push `permission-required`: same with `"permission-required"` → card in overview gets yellow tint.
- Push invalid status: `{"status":"unknown"}` → `400`.
- Open `http://localhost:6100/overview` — project card background changes in real-time via socket.io when status is pushed.
- Full-state push via `/api/projects/:id/update` must NOT reset `claudeStatus` — verify card retains tint after a file-change triggers pushToMaster.

## Notes

- Related: N35 (three-state Claude status badge), N40 (master server upsert by project ID).
- The `claudeStatus` field is additive — existing projects without it show neutral background (no regressions).
- Fire-and-forget means `void fetch(...).catch(() => {})` — no retry, no logging, no block.
