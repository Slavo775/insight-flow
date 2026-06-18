# N152 — surface silent fail-open in writeStatus flow resolution (N131)

**Type:** fix
**Priority:** low
**Created:** 2026-06-18

## Problem

- In `packages/taskflow/src/cli/commands/status-write.ts:14`, the `catch` around `mergedProjects()` (flow resolution for `writeStatus`, N131) swallows the error and silently falls back to canonical (default) status validation for **all** tasks until the bad definition is fixed. A malformed custom flow/agent/module def therefore quietly disables flow-aware validation with no signal to the user.

## Goal

1. When flow resolution fails, emit a single clear `stderr` warning so the degradation is visible.
2. Behavior is otherwise unchanged — still fail-open to canonical validation (never block the lifecycle).

## Scope

### In scope

- `packages/taskflow/src/cli/commands/status-write.ts` — in the existing `catch (err)` (line ~14), add one `console.error(...)` warning, e.g. `warning: could not load project flows (<err.message>); falling back to canonical status validation`. Keep the existing return (canonical fallback).

### Out of scope

- Do NOT change the fail-open behavior itself (it stays safe-by-default — a bad def must never block a status write).
- No changes to `core/set-status.ts`, the schema, or `mergedProjects`.
- No new config/flags.

## Implementation plan

1. **Add the warning.** In the `catch (err)` block, `console.error` a one-line warning including `(err as Error).message`. Return the canonical fallback exactly as today.
2. **Test (optional/light).** If easily testable, assert the warning is emitted when flow resolution throws (e.g. spy on `console.error`); otherwise rely on manual verification given it's a one-liner.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean.
- `pnpm --dir packages/taskflow test` passes (no regressions to existing status-setter/status-write tests).
- Manual: with a malformed `insightFlow/projects/*.json`, run a lifecycle status command — the write still succeeds (canonical), and a warning now prints to stderr.

## Notes

- Source: N131 REVIEW.md non-blocking note ("a one-line stderr warning on the catch would make the degradation visible").
- Pairs with N151 (dashboard-server reliability); both mined from N99–N150 review follow-ups. Trivial, low-risk one-liner.
