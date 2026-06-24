# N177 — Document v1 to v2 migration in README

**Type:** feat
**Priority:** medium
**Created:** 2026-06-24

## Problem

- The README's v1 → 2.0.0 migration story is scattered and incomplete. `migrate-layout` is name-dropped twice (lines 15, 147), but the four data/utility migrate commands are never documented together as an ordered upgrade path.
- The "Migration / utility" command block (`packages/taskflow/README.md:204-205`) lists **only** `insight-flow migrate` (legacy `tracker.json`); `migrate-layout`, `migrate-reviews`, and `migrate-hooks` are missing.
- The "Upgrading insight-flow" section (`packages/taskflow/README.md:783`) covers `bulk-init` / `bulk-prompt-build` (role/scaffold refresh) but says nothing about the v1→v2 data migrations, so an upgrading user has no single checklist to follow.

## Goal

1. Add a consolidated "Upgrading from 1.x to 2.0" subsection to the README with an ordered, copy-pasteable command sequence.
2. List all four migrate commands (`migrate-layout`, `migrate-reviews`, `migrate-hooks`, `migrate`) in the "Migration / utility" block with one-line descriptions.
3. Keep the existing scattered mentions accurate and cross-link them to the new section.

## Scope

### In scope

- `packages/taskflow/README.md` only:
  - New "Upgrading from 1.x to 2.0" subsection under the existing `## Upgrading insight-flow` heading (line ~783).
  - Expand the "Migration / utility" block (lines ~204-205) to include `migrate-layout`, `migrate-reviews`, `migrate-hooks`.
- Command descriptions must match the CLI help text in `packages/taskflow/src/cli/cli.ts:139-146` (source of truth).

### Out of scope

- Changing any CLI behavior or the migrate commands themselves.
- Auto-running migrations from `init` (separate idea; not this task).
- CHANGELOG.md edits — the per-breaking-change notes already exist there.

## Implementation plan

1. **Verify command names + descriptions.** Cross-check against `packages/taskflow/src/cli/cli.ts:139-146` so README text matches `insight-flow help` exactly (`migrate`, `migrate-reviews`, `migrate-layout [--dry-run] [--fix-strays]`, `migrate-hooks [--bin <path>]`).
2. **Add "Upgrading from 1.x to 2.0" subsection** under `## Upgrading insight-flow` (README ~line 783), with the ordered sequence:
   ```bash
   npm install -g insight-flow@latest
   insight-flow migrate-layout --dry-run   # preview the move
   insight-flow migrate-layout             # move workTasks/ → insightFlow/
   insight-flow migrate-reviews            # split reviews/incidents into side files
   insight-flow migrate-hooks              # refresh hook scripts after upgrade
   insight-flow bulk-init                  # re-scaffold role files (or `init` in one project)
   ```
   Note each command is idempotent and that the legacy `workTasks/` layout still resolves via a back-compat shim if migration is deferred.
3. **Expand the "Migration / utility" block** (README ~lines 204-205) to list all four migrate commands with one-line comments.
4. **Cross-link** the existing 2.0.0 highlight (line 15) and storage note (line 147) to the new "Upgrading from 1.x to 2.0" section so readers land on the full checklist.

## Verification

- `grep -n "migrate-reviews\|migrate-layout\|migrate-hooks" packages/taskflow/README.md` shows all three in both the command block and the upgrade section.
- Manually read the new subsection top-to-bottom: the sequence is runnable as-is and ordered correctly (layout → reviews → hooks → scaffold).
- README descriptions match `insight-flow help` output (no drift from `cli.ts`).

## Notes

- Source of truth for command flags/descriptions: `packages/taskflow/src/cli/cli.ts:139-146`.
- Idempotency confirmed in code: `init` deliberately does **not** migrate data — it detects legacy layout and prints a note (`src/agents/init/index.ts:127-131`).
- Follows the 2.0.0 release docs work in N176.
