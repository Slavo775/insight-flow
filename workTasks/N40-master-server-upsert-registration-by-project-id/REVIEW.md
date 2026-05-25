# N40 — Master server: upsert registration by project ID — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds upsert semantics to the master server's project registry. Four files changed: `types.ts` gains `projectId`, `registry.ts` adds a `projectIdIndex` secondary map and an `upsert()` function that rotates the UUID while preserving `registeredAt` and `state`, `server.ts` extracts `projectId` from the POST body (fallback to `label`), and the taskflow client now sends `projectId: config.projectName` on every registration. Risk is low — logic is simple, no persistence, single-threaded Node.js eliminates race conditions. Both packages build clean.

## Checklist verification

- [x] `registry.upsert(projectId, label, url)` exists and replaces `register`; `projectIdIndex` tracks projectId → UUID — **pass** (`registry.ts` lines 5, 7–36)
- [x] Re-registering with the same `projectId` returns a new UUID but does NOT add a second entry — **pass** (old entry deleted on line 16 before inserting on line 19)
- [x] `MasterProjectEntry` has `projectId: string` field — **pass** (`types.ts` line 16)
- [x] `POST /api/register` extracts `projectId` from body (fallback: `label`) — **pass** (`server.ts` line 64)
- [x] `registerWithMaster` sends `projectId: config.projectName` — **pass** (`index.ts` line 222, call sites lines 325 and 343)
- [x] Both packages compile without TypeScript errors — **pass** (both build clean)
- [x] `state` preserved on re-register — **pass** (`registry.ts` line 26: `existing?.state ?? { ... }`)
- [x] Client without `projectId` still registers — **pass** (`server.ts` line 64 fallback: `parsed.label ?? "unknown"`)

## Non-blocking

1. **Client-side `upsertProject` deduplicates by UUID only** (`overview.ts` line 262). When a project re-registers mid-session (gets a new UUID), the next `project-update` socket event carries the new UUID. The client's `findIndex(x => x.id === p.id)` won't find the old card → pushes a new card. The stale old card accumulates until page reload. Server state is correct; overview is only wrong in live-running browser sessions between re-registrations.
   - Suggested fix: `var idx = PROJECTS.findIndex(function(x) { return x.id === p.id || (p.projectId && x.projectId === p.projectId); });` — then swap the `data-id` attribute on the found card to the new UUID before `outerHTML` replacement.
   - Not a blocker: page reload always shows correct state; the server registry is correct.

2. **`register` wrapper is dead code in the shipped server** — `server.ts` now calls `upsert` directly; nothing calls `register`. Fine to keep for backward compat, but can be removed cleanly if desired.

## Security & edge cases

- `projectId` has no length or character validation. For an internal-only server this is acceptable, but a very long projectId would persist in memory indefinitely. Low risk given the deployment model.
- `projectIdIndex.get(projectId)!` non-null assertion (`registry.ts` line 12) is safe: the `.has()` guard on the same ternary expression makes the `!` path unreachable with a missing key.

## Notes

- Live smoke test confirmed: two registrations with `projectId: "smoke-test"` → one card in overview, second UUID present, first UUID absent. Working as intended.
- Follow-up candidate: fix `upsertProject` in `overview.ts` to also match on `projectId` (one-liner).
