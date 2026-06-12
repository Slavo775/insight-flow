# N41 — Project status push: route, socket.io broadcast, and overview styles — Checklist

## Done criteria

- [ ] `MasterProjectState` has `claudeStatus?: "active" | "idle" | "permission-required"` field.
- [ ] `registry.updateStatus(id, status)` exists and mutates only `claudeStatus` + `lastSeenAt`.
- [ ] `registry.update()` (full-state push) preserves existing `claudeStatus` when incoming state omits it.
- [ ] `POST /api/projects/:id/status` route exists on master server; returns `400` for invalid status, `401` for unknown id, `200 { ok: true }` on success.
- [ ] Master emits `io.emit("project-update", entry)` after a successful status update.
- [ ] Overview card CSS has `.proj-card.status-active` (green tint) and `.proj-card.status-permission` (yellow tint) classes.
- [ ] `renderCard` applies the correct CSS class based on `p.state.claudeStatus`.
- [ ] Project server `pushStatusToMaster()` is fire-and-forget (`void fetch(...).catch(() => {})`).
- [ ] `activity.onEvent` handler calls `pushStatusToMaster` when event type/action is `active`, `idle`, or `permission-required`.

## Quality gates

- [ ] `pnpm --dir packages/insight-flow-master run build` passes (no TS errors).
- [ ] `pnpm --dir packages/taskflow run build` passes (no TS errors).
- [ ] No regressions: existing `/api/projects/:id/update` route still works.

## Verification

- [ ] `curl -X POST .../status` with `{"status":"active"}` returns `{"ok":true}` and overview card turns green-tinted within 1 s.
- [ ] `curl -X POST .../status` with `{"status":"permission-required"}` returns `{"ok":true}` and card turns yellow-tinted.
- [ ] `curl -X POST .../status` with `{"status":"unknown"}` returns `400`.
- [ ] Full-state push via `/update` does not clear the `claudeStatus` — card retains its tint color.
