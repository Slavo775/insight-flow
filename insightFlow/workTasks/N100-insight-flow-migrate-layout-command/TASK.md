# N100 — insight-flow migrate-layout command

**Type:** rework
**Priority:** high
**Created:** 2026-06-12

## Problem

- Existing projects (this repo, the playground, all consumer projects) store tasks in `workTasks/` and events in `workTasks/.events/`. With the N99 shim in place, projects need a safe, repeatable command to physically move into the `insightFlow/` layout.

## Goal

1. New CLI command `insight-flow migrate-layout`: moves `workTasks/` → `insightFlow/workTasks/` and `workTasks/.events/` → `insightFlow/events/`.
2. Idempotent: running on an already-migrated project is a no-op with a clear message; partial states are detected and reported with recovery guidance instead of half-moving.
3. `--dry-run` prints the planned moves without touching disk.
4. Post-migration, all CLI commands and the dashboard work via the N99 resolver with no further config.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/migrate-layout.ts` (new) + registration in `cli.ts`.
- Move semantics via `fs.rename` with same-volume assumption + fallback copy/verify/delete.
- Integration test: scaffold legacy temp project → migrate → list/stats/log-event work; second run no-op; `--dry-run` leaves disk untouched.

### Out of scope

- Updating docs/templates/init (N101). Auto-migrating on any other command (explicit invocation only).
- Changes to shard/side-file contents — paths move, JSON stays byte-identical.

## Implementation plan

1. **Command skeleton** — parse `--dry-run`; locate project root via existing config discovery.
2. **Plan phase** — compute move list (workTasks → insightFlow/workTasks, .events → insightFlow/events); detect already-migrated / partial / nothing-to-do states.
3. **Execute phase** — create `insightFlow/`, rename dirs, verify resolver now reports `insightFlow` layout; print summary.
4. **Tests** — integration cases: fresh migrate, idempotent re-run, dry-run, partial-state refusal.

## Verification

- `pnpm build` + package tests green.
- Manual on a playground copy: `insight-flow migrate-layout --dry-run` prints plan; real run moves dirs; `insight-flow list` + dashboard unchanged; re-run prints no-op.

## Notes

- Depends on N99 (resolver must already prefer `insightFlow/`).
- Do NOT migrate this repo or the playground in this task — that proof lands in N101.
