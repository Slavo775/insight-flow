# N117 — set-flow command + dashboard reassignment (ready-only)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Once a task is bound to a flow (N116), the binding is deterministic from task type — so it can be wrong (wrong type, or a type that maps to the wrong flow). The human needs to correct a task's flow, but only before work starts: changing a flow mid-lifecycle would orphan the task's current status against a flow that may not contain that stage. The settled rule is: reassign only while `ready`.

## Goal

1. New `insight-flow set-flow --id Nxx --flow <flowId>` reassigns `Task.flowId`.
2. Allowed **only while `task.status === "ready"`**; any later status errors with a clear message ("flow locks once work starts") and changes nothing.
3. The target flow is validated to exist (`"default"` or a known `custom:*` project flow); unknown → error (CLI non-zero / API 400).
4. Dashboard: a flow dropdown on the task detail page (`/task/:id`), enabled only while the task is `ready`, persisting the change; disabled (with a hint) otherwise.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/` — new `set-flow` command + registration in `cli.ts`.
- `packages/taskflow/src/dashboard/server/index.ts` — a small endpoint to set a task's flow (ready-only + existence guards), or reuse an existing task-mutation path.
- `packages/taskflow/src/dashboard/client/TaskDetailPage.tsx` — the flow dropdown (options = available flows; enabled only when ready).
- Tests: set-flow on a ready task succeeds; on a non-ready task errors + no-op; unknown flow errors; status unchanged.

### Out of scope

- Auto-picking the flow (N116 owns creation). Surfacing the next step (N118). Mid-lifecycle flow changes / status reconciliation (deliberately excluded by the ready-only rule).
- Bulk reassignment; changing the type→flow config (that's N116).

## Implementation plan

1. **CLI** — `set-flow` loads the task, rejects unless `status === "ready"`, validates the target flow exists, writes `flowId`, saves; clear errors otherwise.
2. **Flow existence** — resolve against `"default"` + the user-space project flows (the N108 list endpoint / loader).
3. **API** — endpoint mirrors the CLI guards (404 unknown task, 400 unknown flow, 409/locked when not ready).
4. **Dashboard** — dropdown lists available flows, value = current `flowId`, enabled only while ready; on change call the endpoint, refresh; show a 'locked once work starts' hint when disabled.
5. **Tests** — ready→ok, non-ready→locked, unknown-flow→error.

## Verification

- `pnpm build` + suite green.
- Playground: a `ready` task — `set-flow --flow custom:hotfix` succeeds; advance it past ready → `set-flow` errors with the lock message; unknown flow errors.
- Dashboard: the dropdown reassigns a ready task and is disabled (with hint) once it's in-progress.

## Notes

- Decisions (/task-analyze 2026-06-15): change-flow allowed only while `ready`; locked after. Depends on N116. See N116/ANALYSIS.md.
- The ready-only rule is what lets us skip all mid-lifecycle status-mismatch handling.
