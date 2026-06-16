# N126 — Install execution endpoint with SSE progress

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- The install plan (N125) is computed but nothing applies it from the dashboard, and there's no progress feedback. The human wants to install everything a flow defines and WATCH it happen step by step.

## Goal

1. `POST /api/flow-install` runs the N125 plan: writes `.mcp.json`, `.claude` hooks, skills, and settings idempotently via the emitter.
2. Per-step progress streams over the existing SSE transport: `step-started` / `step-done` / `step-failed` with the item + target.
3. Idempotent + re-runnable (re-install is a no-op / update, never duplicate).
4. A failed step is reported but doesn't abort the rest (best-effort with a summary), or aborts with a clear partial-state report — implementer picks one, documented.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — `POST /api/flow-install`; reuse the N96 emitter / hook+mcp+skill writers.
- Progress events over `transport.emit` (a dedicated `install-progress` event).
- Tests (HTTP): run install in a temp project → files written, progress events emitted, second run idempotent, a forced failure reported.

### Out of scope

- Computing the plan (N125). The UI (N127).
- Installing things not in the plan.

## Implementation plan

1. **Execute** — iterate the plan; for each, call the emitter writer (mcp/hook/skill/settings); emit progress before/after.
2. **Idempotency** — reuse the emitter's manifest/adoption logic (N94/N96) so re-runs don't duplicate.
3. **Errors** — per-step failure surfaced; overall summary.
4. **Tests** — HTTP install + idempotent re-run + progress events + failure.

## Verification

- `pnpm build` + suite green.
- Temp project: `POST /api/flow-install` writes the artifacts, emits ordered progress, second run idempotent; a bad item reports failure without losing the rest.
- Server-side robustness (no crash on a bad plan).

## Notes

- Depends on N125. The progress UI is N127. See N119/ANALYSIS.md.
- Reuses the N96 emitter; idempotency is the N94/N96 adoption logic.
