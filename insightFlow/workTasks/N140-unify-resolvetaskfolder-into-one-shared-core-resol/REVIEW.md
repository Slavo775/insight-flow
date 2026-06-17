# N140 — Unify resolveTaskFolder into one shared core resolver — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-17
**PR:** (no PR yet — branch `rework/N140-unify-resolvetaskfolder`)
**Verdict:** approved

## Summary

Pure refactor: the two divergent `resolveTaskFolder` copies are collapsed into one exported function in `core/config.ts` (`config.ts:130`), next to `getWorkDir`. The body is byte-identical to the basename logic both copies already carried post-N139, so there is no behavior change — only the duplication (and the divergent argument orders that caused the N139 drift) is removed. Low risk; fully covered by the existing N139 suite plus two new direct cases.

## Checklist verification

- [x] One shared `resolveTaskFolder` in `core/` next to `getWorkDir`, exported once, signature `(config, task, cwd?)` — `config.ts:130`. **pass**
- [x] `spec.ts` local copy removed; imports the shared resolver; call sites unchanged — `spec.ts:4` import, `spec.ts:26,51` still `(config, task, cwd)`. **pass**
- [x] `storage.ts` local copy removed; imports shared; all 4 call sites updated to canonical order — `storage.ts:13` import; `147,151,171,197` now `(config, task, cwd)`. **pass**
- [x] `grep "function resolveTaskFolder"` returns exactly one definition — confirmed (`config.ts:130` only). **pass**
- [x] `spec-path.test.mjs` exercises the shared function and keeps both layouts — 2 new direct N140 cases (insightFlow + legacy) added; the 3 N139 cases preserved. **pass**
- [x] Quality gates — build ✓, `tsc --noEmit` ✓, eslint clean on changed files, full suite **232/232** (was 230 + 2 new). **pass**

## Non-blocking

1. The shared resolver landed in `config.ts`, not `paths.ts` as the spec tentatively suggested ("likely paths.ts"). This is the **correct** call, not a deviation: `getWorkDir` lives in `config.ts`, and `config.ts` already imports `paths.ts`, so placing the resolver in `paths.ts` would have created a `paths → config → paths` cycle. Worth recording so the spec's hint isn't mistaken for a miss.
2. `resolveTaskFolder` is now exported from `index.ts`, widening the public surface by one stable function. Acceptable for testability — mirrors N139's `scaffoldReviewMd` export precedent.

## Security & edge cases

- No new input paths. The basename derivation (`split(/[\\/]/).filter(Boolean).pop() ?? task.folder`) is unchanged and still strictly safer than a prefix-strip (can't carry parent segments). Trailing slash, Windows separators, and the degenerate empty folder are all handled exactly as before.
- Type-only `Task` import added to `config.ts`; no runtime cycle (build confirms).

## Notes

- Closes N139 review follow-up #1 ("collapse the two resolveTaskFolder into one shared resolver — the root maintainability cause"). See this folder's `ANALYSIS.md`.
- Sibling N141 (stray-dir cleanup) is the other N139 follow-up; independent.
- Heads-up for the merge/release step: the **global** `insight-flow` binary still ships pre-N139 code (`show --id N139 --spec` → `taskMd: null`), so it would scaffold REVIEW.md into a doubled path. This review's `review-start` was run via the local `dist/cli.js` (correct) to avoid creating a stray. A `npm i -g insight-flow` after the next release clears this.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-17
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None. The two AI-review non-blocking notes (config.ts placement rationale, the `index.ts` export) remain optional, not blockers.

### Notes

- _"done approved please create pr push all changes and merge it via gh"_ — approved; landing via PR (gh) and merged to `main`.
