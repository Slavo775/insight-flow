# N06 — Centralize CLI logic — make packages/taskflow the single source of truth

**Type:** rework
**Priority:** high
**Created:** 2026-05-20

## Problem

Per REVIEW_ANALYSIS.md § 2 ("Code Quality & Migration Debt"), `scripts/task-tracker.mjs` and `packages/taskflow/src/cli.ts` share ~95% of their logic — a high-risk maintenance trap. Even after [[N05]] deletes the legacy script and updates role files, the wider repo (CI workflows, package.json scripts, docs, IDE configs, hooks, skills) may still reference the old path or duplicate logic. This task is the cleanup sweep that guarantees `packages/taskflow` is the only CLI implementation in the repo.

## Goal

1. No file outside `packages/taskflow/` defines or duplicates taskflow command logic (status transitions, ID generation, shard reads/writes).
2. Every script, hook, workflow, doc, and config that needs taskflow functionality calls the `insight-flow` binary (or imports from the package), not a local re-implementation.
3. `packages/taskflow/README.md` documents the binary as the canonical entry point and lists every supported command.
4. CI (if any) builds the package before running anything that depends on it.

## Scope

### In scope

- `package.json` (root) — scripts that wrap taskflow commands.
- `.github/workflows/*.yml` — any CI step that invokes taskflow.
- `.claude/` — hooks, commands, skills, settings that shell out to the CLI.
- `packages/taskflow/README.md` — document the canonical entry point and full command list.
- Any helper scripts in `scripts/` that wrap or duplicate tracker behavior.
- Removing dead code in the package itself if duplication exists between `cli.ts` and `storage.ts` / `commands/`.

### Out of scope

- Editing role files (handled by [[N05]]).
- Adding Zod validation ([[N07]]).
- Moving role templates into the package ([[N08]]).
- UI build standardization ([[N09]]).
- Path resolution refactor ([[N10]]).

## Implementation plan

1. **Inventory all callers**
   - `grep -rn "insight-flow" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist`
   - `grep -rn "task-tracker" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist`
   - `grep -rn "taskflow" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist`
   - Build a table: file → what it currently calls → desired call.
2. **Audit `packages/taskflow/src/` for internal duplication**
   - Check if `cli.ts` and `commands/*.ts` share logic that should be extracted into `storage.ts` or a single helper module.
   - Look for repeated shard-file path computation, status validation, or ID generation.
3. **Update root `package.json` scripts**
   - Any `"task:*"` or similar scripts must call `insight-flow <cmd>`, not the legacy script.
   - Add a workspace alias if it improves DX (e.g., `pnpm task <cmd>` → `pnpm --filter insight-flow exec insight-flow <cmd>`).
4. **Update CI workflows**
   - Ensure `pnpm --filter insight-flow build:cli` runs before any step that uses the binary.
   - Replace any direct `node scripts/...` calls with `insight-flow`.
5. **Update `.claude/` hooks, skills, commands**
   - Replace legacy references with `insight-flow`.
   - If a skill embeds command examples, update them.
6. **Document the canonical entry point**
   - In `packages/taskflow/README.md`: list every supported command with one-line description and flag summary.
   - In root `CLAUDE.md`: under "Scripts", point to the binary and link to the package README.
7. **Verify no duplication remains**
   - `grep -rn "function .*Task\b" --include="*.ts" --include="*.mjs" packages/ scripts/` — confirm task-mutation logic lives only in `packages/taskflow`.
8. **Smoke test**
   - Run `pnpm --filter insight-flow build:cli && insight-flow current` from repo root.
   - Run any CI workflow locally (`act` or equivalent) if available.

## Verification

- `grep -rn "task-tracker" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` returns zero matches (after [[N05]] also lands).
- No file outside `packages/taskflow/` contains the strings `loadMaster`, `loadShard`, or other internal taskflow helpers.
- `packages/taskflow/README.md` lists every command currently exposed by `insight-flow --help`.
- `pnpm --filter insight-flow build:cli` succeeds; `insight-flow current` returns the current task.

## Notes

- Source: REVIEW_ANALYSIS.md § 2 and § 5 Phase 1.2.
- Should land AFTER [[N05]] (or together) — N05 deletes the legacy script and updates roles; N06 finishes the sweep across CI, hooks, scripts, and docs.
- If duplication is found _inside_ the package between `cli.ts` and `commands/`, extract shared logic into `storage.ts` or a `lib/` helper rather than leaving it.
- Don't introduce a new abstraction layer just because — only consolidate where duplication is real.
