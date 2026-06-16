# N127 — Install UI — button + live progress modal

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Installing a flow's artifacts is CLI/endpoint-only; the human wants a dashboard button + a modal that shows the install running live ('watch the installation program with all installations insight-flow is doing now').

## Goal

1. An **Install this flow** button on the flow/project page opens a modal listing the N125 plan (each mcp/hook/skill/settings item).
2. Running it calls `POST /api/flow-install` (N126) and shows **each step live** as it happens (pending → running → done/failed) from the SSE progress stream.
3. Per-step success/error is visible; a final summary; the modal is dismissable and re-runnable.
4. Read-only flows (default, unless ejected) can still be installed.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — an install button on `ProjectPage`; an `InstallModal` consuming the plan + the `install-progress` SSE events.
- `api.ts` — `fetchFlowInstallPlan` + `runFlowInstall` helpers.
- Tests: component-light (the repo has no RTL) — covered by the N125/N126 API tests + typecheck; a manual playground verification.

### Out of scope

- The plan/exec endpoints (N125/N126). New install behavior.
- Auth (dashboard stays local-trusted).

## Implementation plan

1. **Button + modal** — fetch plan, render the item list with per-step status.
2. **Live updates** — subscribe to `install-progress` SSE events (extend `useDashboardStream`), update step states.
3. **Run/summary** — POST to run; show running/done/failed per step + a summary; allow re-run.
4. **Verify** — playground: click Install → watch steps complete.

## Verification

- `pnpm build` + suite green (API tests from N125/N126).
- Playground: Install this flow → modal lists the plan, steps go pending→done live, errors shown; re-run idempotent.
- Default flow installable.

## Notes

- Depends on N125/N126. Closes the install-UX vision. See N119/ANALYSIS.md.
- No React test harness — behavior covered by API tests + typecheck + playground (N106–N118 precedent).
