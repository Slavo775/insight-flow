# N235 — Add release-merge step to Release Manager flow (feature to master) — Checklist

## Implementer subtasks (build in this order)

- [x] `describe`/`get` the composer registry for the shapes (subagents did this: got `custom:release-manager`, `custom:task-release-plan`, `custom:task-release-ship`, `custom:handover-plan-to-ship`, `task-git/*` — all resolve).
- [x] Create module `custom:task-release-merge-identity` (kind `section`) — Release Merger role text incl. the no-PR STOP rule. Rev `e1cce93a24de3806`.
- [x] Create handover `custom:handover-merge-to-ship` — → `custom:task-release-ship`, `on: feature-merged`, **gated**. Rev `74e58a96966b646f`. (Handover stores `{to,on,mode,when}`; `from` = the agent that composes it.)
- [x] Create handover `custom:handover-plan-to-merge` — → `custom:task-release-merge`, `on: ready-to-release`, **auto**. Rev `318de4f3040bf83c`.
- [x] Create agent `custom:task-release-merge` with the 11-module ordered list; `command.install: true`; no subagents. Rev `f5348a405e01acf7`. All modules resolve.
- [x] Update agent `custom:task-release-plan`: swapped `custom:handover-plan-to-ship` → `custom:handover-plan-to-merge` (same position). Rev `6004e488ffd2c2db`. `custom:handover-plan-to-ship` left unedited.
- [x] Update flow `custom:release-manager`: added `custom:task-release-merge` to agents; added non-terminal status `feature-merged` (skipped optional `merging`); re-pointed `plan → ship` to `plan → merge`; added `merge → ship` on `feature-merged`. Rev `99aa4537b451f17f`.
- [x] Verify composition: agent + flow `get` clean; every referenced id resolves; no unresolved module/edge endpoint.

## Verification

- [x] Flow graph coherent: entry `check`; path `check → plan → merge → ship → rollout → done`; `plan → merge` auto, `merge → ship` gated; back-edge `fix → check` still gated; terminators `not-able-to-release` + `done` reachable; `feature-merged` has exactly one outgoing edge (→ ship). (Verified by flow-author.)
- [ ] Install dry-run of `custom:release-manager` (Claude harness) — **deferred to the Installer** (install is prohibited in the implement phase; a separate gated step).
- [ ] Smoke run on a task with an open PR — **deferred to review/install** (needs the flow installed).
- [x] `custom:task-release-ship` unchanged (still merges the release-please PR + publishes); `custom:handover-plan-to-ship` unedited.
