# N60 — master registry upsert generates new UUID on every re-registration causing duplicate project cards — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** https://github.com/Slavo775/insight-flow/pull/40
**Verdict:** approved

## Summary

Two-file fix in `packages/insight-flow-master`. `registry.ts` `upsert()` is restructured so existing-project re-registrations mutate the entry in place and return the same UUID, while first-time registrations still allocate a fresh UUID. `server.ts` gains one `io.emit("project-update", entry)` line after `upsert` so open overview tabs refresh on re-registration. Risk is low — logic is minimal, the happy path (no existing entry) is unchanged, and the mutation path (existing entry) is simpler than before.

## Checklist verification

- [x] `upsert()` preserves `existing.id` — no new UUID for already-registered projects — **pass**: existing branch returns `existing.id` early; `randomUUID()` moved inside the else (first-time only)
- [x] `POST /api/register` emits `io.emit("project-update", entry)` after upsert — **pass**: `server.ts:65-66` fetches entry and emits before 200 response
- [x] `pnpm --dir packages/insight-flow-master run build` passes — **pass**: confirmed clean ESM build (30.78 KB, 9ms)
- [x] TypeScript compiles cleanly — **pass**: no type errors, `tsup` exit 0
- [x] No regressions in `upsert` / `update` / `updateStatus` paths — **pass**: `update()` and `updateStatus()` both key on UUID returned from `upsert` / stored as `masterId`; UUID is now stable within master lifetime so both paths always find their entry

## Non-blocking

- **Spec inconsistency silently resolved**: `TASK.md` Out-of-scope listed `server.ts — no changes needed`, but the implementation plan (step 2) and checklist both required the `server.ts` emit. Implementer correctly followed the more specific guidance. Worth a follow-up tidy to the spec template process.
- **`register()` legacy wrapper** (`registry.ts:38`): passes `label` as both `projectId` and `label` — unchanged pre-existing behaviour. If ever two projects share the same label they'd collide on re-registration. Not a problem today (projectId comes from `config.projectName`, which is per-project), but worth flagging for if the function ever gets a wider call surface.

## Security & edge cases

- `if (entry) io.emit(...)` guard in `server.ts` is correct — `getById` cannot return `undefined` here (upsert always inserts or mutates), but the guard costs nothing and prevents a crash if the invariant ever breaks.
- State preservation on re-registration is correct: `existing.state` is untouched by the mutation path, so a reconnecting project server retains the last-known task state until the first `pushStateToMaster` overwrites it. Desirable behaviour.

## Notes

- Closes the duplicate-card accumulation bug observed in the master overview screenshot (N60). Root cause traced to N40's `upsert` implementation rotating UUIDs unnecessarily.
- Master-server restart still assigns a new UUID (in-memory `projectIdIndex` is cleared), but that scenario forces a page reload of the overview anyway, so the frontend re-renders from fresh SSR state — no duplicate possible.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-27
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

accepted done merge it
