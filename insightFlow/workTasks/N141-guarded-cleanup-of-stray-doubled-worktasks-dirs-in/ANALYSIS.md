# N141 — Analysis (Pre-Taskmaster)

## Problem framing

The N139 bug, while live, made `scaffoldReviewMd` write `REVIEW.md` into a doubled path
(`insightFlow/workTasks/workTasks/Nxx-…/REVIEW.md`). N139 stopped new strays but does not
clean ones already on disk in projects that ran the buggy build (between the N101 layout
migration and the N139 fix). The N139 review called this a "one-off manual `rm` per
project" — but a stray `REVIEW.md` could hold a *real* review written into the wrong path,
so blind deletion risks losing review content.

## Goal

A content-safe, dry-run-by-default cleanup pass in `migrate-layout` that detects stray
doubled dirs, removes only empty/scaffold-only ones under an explicit apply flag, and
preserves + reports any stray carrying real content.

## Options considered

1. **Document a manual cleanup snippet, no code.** Cheapest; fine if only the maintainer's
   local installs are affected. Rejected for this task by decision (want external-consumer
   coverage) — but kept as the fallback if reach turns out to be trivial.
2. **Guarded command folded into `migrate-layout` (chosen).** `migrate-layout.ts` already
   does fs surgery (`rmSync`, `readdirSync`) and has stray-detection precedent at lines
   ~52–57, so it's the natural home and idempotent on re-run.
3. **New standalone `cleanup-strays` command.** More surface area for a narrow, one-time
   concern; rejected in favor of extending the existing migration command.
4. **Auto-merge stray review content back into the correct folder.** Highest effort and
   highest risk (which review wins?); explicitly out of scope — warn only.

## Decision

Option 2, with dry-run default and content-safety as hard requirements. Split from N140
because a destructive migration shouldn't be reviewed alongside a no-op refactor.

## Open questions

- Precise "scaffold-only" definition for `REVIEW.md` (template-equality vs structural
  heuristic) — implementer documents the chosen rule.
- Apply-flag name (`--fix-strays` vs `--apply`) — implementer's call, keep it explicit.
- This repo has **zero** strays now, so tests must seed fixtures rather than rely on
  ambient state.

## Sources

- `insightFlow/workTasks/N139-fix-doubled-task-folder-path-in-spec-ts-resolvetas/REVIEW.md`
  (non-blocking follow-up #2).
- `packages/taskflow/src/cli/commands/migrate-layout.ts` (existing fs surgery + stray
  detection, lines ~52–57, 122).
- `find … -path '*workTasks/workTasks*'` → empty in this repo (confirmed clean).

## Handoff brief

Type: feat · Priority: low · Tags: cli, migrate-layout, safety. Add a dry-run-by-default,
content-safe stray-dir cleanup pass to `migrate-layout`; explicit apply flag deletes only
scaffold-only strays, preserves + reports content-bearing ones; tests cover all three
cases. Out of scope: N140, auto-merging review content.
