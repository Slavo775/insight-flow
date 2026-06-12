# N99 — insightFlow layout — path indirection + back-compat shim

**Type:** rework
**Priority:** high
**Created:** 2026-06-12

## Problem

- Storage paths hardcode the `workTasks/` root and `.events` dir across the package. The new round consolidates everything insight-flow owns under a single root folder `insightFlow/`; before anything can move, every path consumer must go through one indirection that prefers the new layout and falls back to the legacy one.

## Goal

1. `packages/taskflow/src/core/paths.ts` exposes a root resolver: if `<project>/insightFlow/workTasks/` exists use the `insightFlow/` layout, else fall back to legacy `workTasks/` + `workTasks/.events`.
2. All path consumers (`core/storage.ts`, `core/config.ts`, CLI commands, dashboard server, agents hooks, master) resolve through the new helpers — zero remaining string literals `"workTasks"` outside `paths.ts` and tests.
3. Behavior for un-migrated projects is byte-for-byte unchanged (legacy layout keeps working with no warnings).
4. Layout detection is computed per call (no module-level cache that goes stale after N100 migrates a live project).

## Scope

### In scope

- `packages/taskflow/src/core/paths.ts` — `resolveFlowRoot(projectDir)`, `tasksDir()`, `eventsDir()` helpers + layout detection.
- Sweep of direct `workTasks` / `.events` literals in `core/`, `cli/`, `dashboard/server/`, `agents/`, `master/` to route through the helpers.
- Unit tests covering both layouts (temp dirs: legacy-only, insightFlow-only, both-present → insightFlow wins).

### Out of scope

- Physical migration of files (N100). Docs/templates/init scaffolding sweep (N101).
- User-space module/agent/project registries (N102) — this task only prepares the root.
- Any rename of on-disk shard or side-file formats.

## Implementation plan

1. **Add resolver** — `resolveFlowRoot(projectDir)` in `core/paths.ts`: returns `{ root, tasksDir, eventsDir, layout: "insightFlow" | "legacy" }`.
2. **Sweep literals** — `grep -rn 'workTasks\|\.events' packages/taskflow/src` and route every hit through the helpers.
3. **Master server** — multi-project registry path handling uses the same resolver per registered project.
4. **Tests** — `node:test` cases for the three detection scenarios + a smoke test that the playground (legacy) still lists tasks.

## Verification

- `pnpm build` + `pnpm --dir packages/taskflow test` green.
- `pnpm play` against the un-migrated playground: dashboard, `insight-flow list`, `stats`, event logging all work unchanged.
- Manual: create `insightFlow/workTasks/` copy in a temp project → CLI reads from it, ignores legacy root.

## Notes

- Foundation of the N99–N112 round (see ANALYSIS.md in this folder for the full round plan).
- N100 (migrate-layout command) and N101 (ecosystem sweep) build directly on this; land first.
