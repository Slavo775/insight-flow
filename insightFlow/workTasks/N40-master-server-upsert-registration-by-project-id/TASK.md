# N40 — Master server: upsert registration by project ID

**Type:** fix
**Priority:** high
**Created:** 2026-05-25

## Problem

The master server's `registry.register()` always creates a brand-new UUID entry on every `POST /api/register` call. No stable project identity is tracked, so every server restart or re-registration (triggered by a 401 from `/api/projects/:id/update`) mints a new orphan entry. The overview page fills with duplicate stale cards for the same project.

## Goal

1. A project that registers with the same `projectId` never creates a second entry — the existing entry is updated with a fresh UUID instead.
2. The overview page shows exactly one card per logical project.
3. Backward-compatible: clients that omit `projectId` fall back to `label` as the key (no hard break for existing consumers).
4. The taskflow client sends a stable `projectId` (derived from `config.projectName`) on every registration call.

## Scope

### In scope

- `packages/insight-flow-master/src/registry.ts` — replace `register()` with `upsert()`, add secondary `projectIdIndex` map.
- `packages/insight-flow-master/src/types.ts` — add `projectId: string` to `MasterProjectEntry`.
- `packages/insight-flow-master/src/server.ts` — extract `projectId` from POST body; call `upsert`.
- `packages/taskflow/src/server/index.ts` — `registerWithMaster` sends `projectId: config.projectName` in the POST body.

### Out of scope

- Persisting the registry to disk (still in-memory).
- Cleaning up genuinely stale entries (separate concern).
- Adding a `projectId` field to `taskflow.config.json` (use `projectName` as-is for now).
- Any dashboard UI changes beyond de-duplication from the data fix.

## Implementation plan

1. **`types.ts` — add `projectId` to `MasterProjectEntry`**
   - Add `projectId: string` field after `id`.

2. **`registry.ts` — replace `register` with `upsert`**
   - Add module-level `const projectIdIndex = new Map<string, string>();` (projectId → current UUID).
   - Add `export function upsert(projectId: string, label: string, url: string): string`:
     - If `projectIdIndex.has(projectId)`: get old UUID via `projectIdIndex.get(projectId)`, remove old entry from `registry`, generate new UUID, re-insert updated entry (preserve `registeredAt`, preserve `state` if any), update `projectIdIndex`.
     - Else: create fresh entry (same as old `register`), add to `projectIdIndex`.
   - Remove the old `register` export (or keep as thin wrapper calling `upsert` with `label` for backward compat — preferred to avoid breaking anything calling it directly in tests).
   - No changes needed to `update`, `getAll`, `getById`.

3. **`server.ts` — use `upsert` in `POST /api/register`**
   - Widen the parsed body type to `{ label?: unknown; url?: unknown; projectId?: unknown }`.
   - Derive `projectId = String(parsed.projectId ?? parsed.label ?? "unknown")`.
   - Replace `registry.register(label, projectUrl)` → `registry.upsert(projectId, label, projectUrl)`.

4. **`packages/taskflow/src/server/index.ts` — send `projectId` during registration**
   - In `registerWithMaster(masterUrl, label, projectUrl)`, add `projectId: string` param.
   - Include `projectId` in the JSON body: `JSON.stringify({ projectId, label, url: projectUrl })`.
   - At call site (`setupMasterIntegration`, line ~325 and ~343), pass `config.projectName` as `projectId`.

## Verification

- Start master server and register the same project twice: `curl -s -X POST http://localhost:6100/api/register -H 'Content-Type: application/json' -d '{"projectId":"my-proj","label":"my-proj","url":"http://localhost:6006"}'` — second call must return a different `id` but the overview must still show only one card for `my-proj`.
- Open `http://localhost:6100/overview` after running `pnpm play` (two browser tabs) — only one card per project name.
- After master restarts and re-registers (simulated by a second `POST /api/register` with the same `projectId`), no duplicate appears.
- `pnpm --dir packages/taskflow run build && pnpm --dir packages/insight-flow-master run build` — both compile clean.

## Notes

- `projectId` falls back to `label` in the server handler so existing clients (no `projectId` field) are not broken.
- `state` is preserved on re-registration so the overview doesn't flash blank on reconnect.
- Related: the 401 re-registration path in `index.ts` (line ~343) is the main trigger for orphans — the upsert fixes it silently.
