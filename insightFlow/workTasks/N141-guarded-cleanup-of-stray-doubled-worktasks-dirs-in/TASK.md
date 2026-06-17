# N141 — Guarded cleanup of stray doubled workTasks dirs in migrate-layout

**Type:** feat
**Priority:** low
**Created:** 2026-06-17

## Problem

- Projects that ran an `insight-flow` build *between* the N101 layout migration and the N139 fix produced stray doubled directories: `insightFlow/workTasks/workTasks/Nxx-…/` (the bug `spec.ts`'s `scaffoldReviewMd` `mkdir`'d a `REVIEW.md` into a doubled path). N139 stopped new strays but does not clean existing ones; the review documented this as a *"one-off manual `rm` per project."* That manual step is unsafe to hand-wave: a stray `REVIEW.md` may contain a real review someone wrote into the wrong path, so blind deletion can destroy review content.

## Goal

1. `insight-flow migrate-layout` detects stray `<workDir>/workTasks/Nxx-…` doubled directories.
2. Detection is **dry-run by default**: report what would be removed, delete nothing without an explicit apply flag.
3. Cleanup is **content-safe**: only stray dirs whose `REVIEW.md` is empty / scaffold-only are eligible for removal; a stray carrying real review content (or any unexpected file) is preserved and surfaced for manual handling.
4. Behavior is covered by tests for the safe, unsafe, and dry-run cases.

## Scope

### In scope

- `packages/taskflow/src/cli/commands/migrate-layout.ts` — add a stray-detection + cleanup pass (the file already imports `rmSync`, `readdirSync`, `existsSync` and has partial-layout stray detection at lines ~52–57, so extend that idiom).
- A flag to opt into deletion (e.g. `--fix-strays` / `--apply`), with dry-run as the default; clear stdout reporting of detected strays and the decision (removed / preserved-with-reason) for each.
- "Scaffold-only" definition for `REVIEW.md`: matches the create template output (no human/AI review content appended). Decide via template comparison or an emptiness/structural heuristic — document the rule chosen.
- Tests under `packages/taskflow/test/` covering the three cases.

### Out of scope

- N140 (resolver unification) — separate task.
- Auto-merging stray review content back into the correct `insightFlow/workTasks/Nxx-…/REVIEW.md` — warn and leave for manual handling; no merge logic here.
- Any change to the N101 forward-migration path itself beyond adding this cleanup pass.

## Implementation plan

1. **Locate strays.** In `migrate-layout.ts`, after the work dir is resolved, scan for `<workDir>/workTasks/` and enumerate child `Nxx-…` dirs (the doubled segment). Skip cleanly when none exist (the common case — this repo is already clean).
2. **Classify each stray.** For each, inspect `REVIEW.md` (and any other files): scaffold-only/empty → eligible; real content or unexpected files → preserve + record reason.
3. **Dry-run report.** Default run prints each stray and its classification (would-remove / preserved-because-…) and exits without deleting.
4. **Apply path.** With the apply flag, `rmSync(strayDir, { recursive: true })` only for eligible strays; re-print the same report marking actual removals. Never touch preserved strays.
5. **Tests.** Add cases: (a) empty-scaffold stray → removed under apply, reported under dry-run; (b) content-bearing stray → preserved in both modes; (c) dry-run deletes nothing.

## Verification

- `insight-flow migrate-layout` (no apply flag) in a project with a seeded stray prints the detection report and leaves the filesystem untouched.
- With the apply flag, an empty-scaffold stray is removed; a content-bearing stray remains and is reported as preserved.
- `pnpm --dir packages/taskflow test` green including the new cases; `pnpm typecheck`, `lint`, `format:check` pass.

## Notes

- Follow-up #2 from the N139 review (the *"clean stray dirs"* non-blocking item). This repo currently has **zero** strays (`find … -path '*workTasks/workTasks*'` empty) — the value is for other consumer projects that ran the buggy build. See `insightFlow/workTasks/N139-fix-doubled-task-folder-path-in-spec-ts-resolvetas/REVIEW.md` and this folder's `ANALYSIS.md`.
- Sibling task N140 unifies the two resolvers (the other N139 follow-up). Independent of this task.
