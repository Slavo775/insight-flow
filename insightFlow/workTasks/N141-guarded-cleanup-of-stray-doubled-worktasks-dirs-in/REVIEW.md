# N141 — Guarded cleanup of stray doubled workTasks dirs in migrate-layout — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet — branch `feat/N141-guarded-cleanup-stray-worktasks-dirs`)
**Verdict:** approved

## Summary

Adds a `handleStrays` pass to `migrate-layout` that detects doubled `insightFlow/workTasks/workTasks/Nxx-…` dirs and reports them. The pass is correctly wired into the **no-op (already-insightFlow) path** — the one that actually reaches affected projects — as well as post-migration. Deletion is gated behind `--fix-strays` *and* `not --dry-run`, and only touches dirs classified eligible (empty, or a single scaffold-only REVIEW.md); anything with real review content or unexpected files is preserved with a reason. Conservative throughout (every ambiguous case fails toward *preserve*). Low risk; 7 integration tests drive the real CLI across all branches.

## Checklist verification

- [x] Detects `<workDir>/workTasks/Nxx-…` doubled strays; skips cleanly when none — `handleStrays` returns `undefined` if the parent is absent or has no `Nxx-` children (`migrate-layout.ts:179-185`); field omitted so existing output is unchanged. **pass**
- [x] Dry-run by default; nothing deleted without an explicit apply flag — `apply = fixStrays && !dryRun` (`:187`); report-only otherwise, with a `hint`. **pass**
- [x] Apply removes only scaffold-only/empty strays; content-bearing preserved + reported — `classifyStray` (`:240`) + the `eligible && apply` guard (`:196`). **pass**
- [x] "Scaffold-only" rule implemented + documented — `isScaffoldReview` (`:264`): verdict still `pending`, Summary placeholder intact, no `## Round` block; documented in its doc comment. **pass**
- [x] Per-stray report distinguishes would-remove / removed / preserved — `dirs[]` carries `eligible` / `removed` / `reason`; `hint` covers the would-remove case. **pass**
- [x] Quality gates — build ✓, `tsc --noEmit` ✓, eslint + prettier clean on changed files, full suite **237/237** (230 + 7 new). **pass**
- [x] Help text updated (`cli.ts:136`) to document `--fix-strays`. **pass**

## Non-blocking

1. `isScaffoldReview` keys on the literal `<one paragraph: what changed, risk level>` placeholder from the *current* `REVIEW.md.tpl`. If that template's wording ever changes, genuinely-scaffold strays written by an older binary stop matching and are **preserved** rather than removed. That's the safe failure direction, but it means cleanup can silently under-remove after a template edit — worth a comment cross-referencing the template, or anchoring on a more stable token (the required `**Verdict:** pending` line already does most of the work).
2. Stray detection is skipped on the legacy `--dry-run` path (it returns before the post-migration `handleStrays`). Correct in practice — a pre-migration legacy project cannot have `insightFlow/workTasks/workTasks/` — and the realistic preview case (already-insightFlow + `--dry-run`) is covered via the no-op path. Noted only for completeness.

## Security & edge cases

- Deletion scope is tightly bounded: only `<tasksDir>/workTasks/Nxx-…` children matching `/^N\d+-/`, and the parent is removed only after `readdirSync` confirms it is empty (minus `.DS_Store`) — never while a preserved stray remains. No traversal outside the doubled parent.
- No arbitrary/`task.folder` input is involved; dir names come from the filesystem and are regex-gated.
- Real task data (`master.json`, shards, correct single-nested task folders) is never in the deletion set — verified by the "real task data untouched" assertion in the scaffold-only test.

## Notes

- Closes N139 review follow-up #2 ("clean stray dirs"). This repo has **zero** strays today (`find … -path '*workTasks/workTasks*'` empty), so value is for other consumer projects that ran the buggy build. See this folder's `ANALYSIS.md`.
- The 7 tests cover: report-only default, scaffold-only removed (+ parent removed), empty removed, content-bearing preserved, unexpected-files preserved, `--dry-run --fix-strays` no-op, clean project omits the field.
- Sibling N140 (resolver unification) is the other N139 follow-up; independent and also approved this round.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-17
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None. The two AI-review non-blocking notes (scaffold heuristic coupled to the template, legacy `--dry-run` skip) remain optional, not blockers.

### Notes

- _"done approved please create pr push all changes and merge it via gh"_ — approved; landing via PR (gh) and merged to `main`.
