# N61 — master overview grid: equal-width columns with responsive single-column fallback — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** https://github.com/Slavo775/insight-flow/pull/41
**Verdict:** approved

## Summary

Pure CSS fix in `packages/insight-flow-master/src/overview.ts`: three old `.card-grid` rules replaced with `repeat(2, minmax(0, 1fr))` + a single `@media (max-width: 800px)` breakpoint; `applyGridClass()` JS function and its two call sites removed; `min-width: 0` added to `.proj-card`. Net change: +3 lines, −14 lines. Risk is low — CSS-only layout change, no logic altered, no new dependencies.

## Checklist verification

- [x] `.card-grid` uses `repeat(2, minmax(0, 1fr))` — `grid-2`/`grid-multi` classes gone — **pass**: diff confirms replacement on line 60
- [x] `@media (max-width: 800px)` drops to single column — **pass**: added on new line 61
- [x] `.proj-card` has `min-width: 0` — **pass**: appended to existing rule
- [x] Task title has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — **pass**: pre-existing on `overview.ts:72`, unchanged by this diff
- [x] `applyGridClass()` and all call sites removed — **pass**: function body gone + both `applyGridClass()` calls removed from `renderAll()` and `upsertProject()`
- [x] Build passes — **pass**: `tsup` ESM 30.42 KB, 6ms, no errors

## Non-blocking

- **Single-project edge case**: the original code fell back to a 1-column grid when `PROJECTS.length < 2`. With `repeat(2, minmax(0, 1fr))` always active, a single registered project renders at 50% width with an empty second column. Cosmetically suboptimal, but not a bug — and the primary use case (multiple projects) is now correct. Could be addressed later with `grid-column: 1 / -1` on the sole card if users report it.
- **800px breakpoint**: slightly below typical laptop widths (~1024px). Works correctly but a 900–1000px threshold would give more breathing room in narrow browser windows. Non-blocking given the iframe embed target.

## Security & edge cases

None — CSS-only change, no user input surfaces affected.

## Notes

- `minmax(0, 1fr)` is the canonical fix for grid-item content overflowing a `1fr` track; the `min-width: 0` on `.proj-card` is a redundant but harmless belt-and-suspenders guard.
- The media query inside an inline `<style>` tag is valid and well-supported.
- `.proj-task-title` ellipsis was pre-existing (line 72) — the checklist item was already satisfied before this PR.
