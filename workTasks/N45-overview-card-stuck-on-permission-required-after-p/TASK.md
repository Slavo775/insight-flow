# N45 — Overview card stuck on permission-required after permission granted

**Type:** fix
**Priority:** high
**Created:** 2026-05-26

## Problem

When a project triggers a permission request the master overview card correctly turns red ("permission required"). But after the user grants the permission, the card stays red forever — it never transitions back to "active". Reproduced: koktejl-new card showing "permission required" with `tool-approved` already visible in the activity feed.

## Goal

1. Granting a permission (tool-approved event) immediately pushes `"active"` status to the master, turning the card green.
2. The status flow is: `active` → `permission-required` (on approval-required) → `active` (on tool-approved) → `idle` (on idle/agent-idle).
3. No regression: the existing status transitions for idle, active, and permission-required continue to work.

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — add `"tool-approved": "active"` to `CLAUDE_STATUS_MAP` (~line 590).

### Out of scope

- The per-project dashboard's own Claude status badge (managed client-side in `dashboard.ts`) — already handles `tool-approved` correctly.
- Master server code — `POST /api/projects/:id/status` already accepts `"active"`.
- No schema changes, no UI changes, no new files.

## Root cause

`CLAUDE_STATUS_MAP` maps hook event actions to Claude status strings pushed to master. It has `"approval-required"` → `"permission-required"` but no entry for `"tool-approved"`. When the user grants permission, `CLAUDE_STATUS_MAP["tool-approved"]` is `undefined`, so `pushStatusToMaster` is never called and the master retains the stale `"permission-required"` status.

## Implementation plan

1. **Edit `CLAUDE_STATUS_MAP`** in `packages/taskflow/src/server/index.ts`
   - Add `"tool-approved": "active"` after the `"approval-required"` entry.
   - Final map should be:
     ```ts
     const CLAUDE_STATUS_MAP: Record<string, string> = {
       "active": "active",
       "agent-active": "active",
       "idle": "idle",
       "agent-idle": "idle",
       "approval-required": "permission-required",
       "tool-approved": "active",
     };
     ```

2. **Build** — `pnpm --dir packages/taskflow run build` to confirm no TS errors.

3. **Update tracker** — `insight-flow implement-end --id N45 --files "packages/taskflow/src/server/index.ts"`.

## Verification

- Trigger a permission request in a running project session.
- Grant the permission.
- Observe the master overview card transitions from red "permission required" to green "active" within ~2 s.
- `pnpm --dir packages/taskflow run build` passes.

## Notes

- `tool-approved` event is emitted by the `PostToolUse` hook when the user approves a tool call.
- The debounce timer at line 606 fires `pushToMaster` (full state push) 2 s after the status push, so both the quick status update and the full state sync happen.
- Related: N41 (status push added), N43 (snapshot replay sound fix).
