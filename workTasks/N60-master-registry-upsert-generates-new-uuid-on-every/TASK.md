# N60 — master registry upsert generates new UUID on every re-registration causing duplicate project cards

**Type:** fix
**Priority:** high
**Created:** 2026-05-27

## Problem

`packages/insight-flow-master/src/registry.ts` — `upsert()` calls `randomUUID()` unconditionally, so **every re-registration gives the project a new UUID**. Re-registration fires on every project-server restart (the module-level `masterId` resets to `null`, initial `setupMasterIntegration` call hits `POST /api/register`) — or when a stale `masterId` triggers a 401 from `pushStateToMaster` after a master-server restart.

The server-side registry is correct: `projectIdIndex` deduplicates by `projectId`, so a page reload of the overview always shows exactly 1 card per project. The problem is **client-side accumulation**: `upsertProject()` in `overview.ts` matches on `entry.id` (UUID). When the UUID changes, the old card is never removed — a new card is inserted for the new UUID. Each project-server or master-server restart stacks another duplicate that persists until the next page reload.

## Goal

1. `upsert()` reuses the existing UUID when a project is already registered; only the first-ever registration allocates a fresh UUID.
2. Re-registration after a master restart updates the existing card in place (no duplicate).
3. One project → exactly one card throughout the master server's lifetime.
4. No changes required in the frontend (`upsertProject` continues to key on `entry.id`).

## Scope

### In scope

- `packages/insight-flow-master/src/registry.ts` — `upsert()` function: preserve `existing.id` instead of always using `newId`.

### Out of scope

- Frontend `overview.ts` — no changes needed.
- `server.ts` — no changes needed.
- Project-server (`packages/taskflow/src/server/index.ts`) — no changes needed.

## Implementation plan

1. **Fix `upsert` in `registry.ts`**
   - Move `const newId = randomUUID()` inside the `else` branch (first-time registrations only).
   - When `existing` is found: update `url`, `label`, `lastSeenAt` in-place on the existing entry; return `existing.id` unchanged.
   - Remove the `registry.delete(existing.id)` + `registry.set(newId, …)` dance for the existing-entry path.

2. **Emit `project-update` after upsert in `server.ts`**
   - In the `POST /api/register` handler, after `registry.upsert(…)`, fetch the entry with `registry.getById(id)` and emit `io.emit("project-update", entry)` so an already-open overview tab refreshes immediately on re-registration (e.g. after master restart).

3. **Build and smoke-test**
   - `pnpm --dir packages/insight-flow-master run build` must pass.
   - Start master + two project servers, confirm overview shows exactly 2 cards.
   - Restart master server, confirm cards reappear with the same IDs (no duplicates) after project servers reconnect.

## Verification

- `pnpm --dir packages/insight-flow-master run build` — clean compile.
- Manual: start `pnpm play` (insight-flow playground) + open overview → restart master → verify card count stays at 1 per project, no duplicates accumulate.
- Trigger a few activity events; confirm card count does not grow.

## Notes

- `upsert` was introduced in N40 (fix/N40-master-server-upsert-registration-by-project-id) to deduplicate by `projectId`. The UUID rotation was unnecessary — `projectIdIndex` already handles identity mapping server-side. The UUID only needs to be stable for the frontend to match cards correctly.
- `pushStatusToMaster` (fire-and-forget, no 401 handling) is safe; only `pushStateToMaster` triggers re-registration. The trigger is always a restart (project server or master), not every individual event — but the cumulative effect over a normal dev session is many duplicates.
- After the fix, `upsert` on an already-known `projectId` becomes a cheap metadata update (label, url, lastSeenAt) with no registry churn.
