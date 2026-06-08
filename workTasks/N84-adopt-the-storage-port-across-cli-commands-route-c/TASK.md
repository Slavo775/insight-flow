# N84 — Adopt the Storage port across CLI commands — route call sites through jsonFileStorage

**Type:** rework
**Priority:** medium
**Created:** 2026-06-08

## Problem

N81 introduced a `Storage` port (`packages/taskflow/src/core/storage-port.ts` + `jsonFileStorage`) but only `cli.ts`'s master-load uses it; **~120 direct `storage.ts` free-function call sites** remain across `cli/cli.ts` + `cli/commands/*`. Until they route through the port, swapping the storage backend isn't a single-point change — the seam's value is unrealized.

## Goal

1. CLI + command call sites read/write through `jsonFileStorage` (the `Storage` port) instead of importing `storage.ts` free functions directly.
2. A future backend = implement `Storage` + swap the injected/imported instance, with no caller changes.
3. **Strictly behavior-preserving** (the port delegates to the same functions; signatures are `typeof`-derived).

## Scope

### In scope

- Migrate the ~120 call sites in `cli/cli.ts` + `cli/commands/*` from free-function calls (`loadMaster`, `saveMaster`, `loadShard`, `saveShard`, `loadTaskById`, `loadAllTasks`, `loadTaskReviews`, `saveTaskReviews`, `loadTaskIncidents`, `saveTaskIncidents`, …) to `jsonFileStorage.*`.
- Decide in ANALYSIS: import the `jsonFileStorage` singleton per module (low-churn) **vs** inject a single `Storage` through command signatures (cleaner swap, more churn).
- Keep `storage.ts` free functions as the implementation behind the port.

### Out of scope

- Implementing a non-JSON backend; the transport swap (N83); lint (N82); any schema change.
- Side-file/util helpers in `storage.ts` not part of the `Storage` port (leave unless trivially includable).

## Implementation plan

1. **Decide adoption style** — singleton import vs dependency injection (record in ANALYSIS; injection is cleaner for a future swap but touches command signatures).
2. **Migrate module-by-module** — `cli/commands/*` then `cli.ts`; rely on `tsc` to catch missed/renamed call sites.
3. **Confirm coverage** — no remaining direct `storage.ts` imports for port methods in `cli/commands/*`.
4. **Verify behavior-preserving** via the full `node:test` suite (commands are exercised end-to-end there).

## Verification

- `grep` shows command modules import port methods from `storage-port.js`, not `storage.js`.
- `pnpm --dir packages/taskflow test` green (commands behave identically).
- typecheck green.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Follow-up to N81 (review finding #2). **Lower urgency** — highest value if/when a real alternative storage backend is coming. North Star: **"lean now, scale deliberately."**
- Independent of N82 (lint) and N83 (transport).
