# N66 — promote bulk-init and bulk-prompt-build to top-level commands — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** https://github.com/Slavo775/insight-flow/pull/45
**Verdict:** approved

## Summary

Surgical rework: promotes `batch-ui --init` / `batch-ui --prompt-build` (v0.11.0 flags) to `bulk-init` / `bulk-prompt-build` as standalone top-level commands, and bumps the package to v0.11.1. The four changed files — `cli.ts`, `README.md`, `package.json`, `CHANGELOG.md` — are all touched precisely within spec scope. No logic changes, no new dependencies, low risk. Old `batch-ui --init` / `--prompt-build` flags silently fall through to the UI launcher as expected.

## Checklist verification

- [x] `insight-flow bulk-init` is a top-level command in `cli.ts` — **pass** (diff: `else if (command === "bulk-init") { await cmdBatchInit(opts); }`)
- [x] `insight-flow bulk-prompt-build` is a top-level command in `cli.ts` — **pass** (diff: `else if (command === "bulk-prompt-build") { await cmdBatchPromptBuild(opts); }`)
- [x] `opts.init` and `opts["prompt-build"]` branches removed from `batch-ui` block — **pass** (both removed in diff)
- [x] Help text shows `bulk-init` and `bulk-prompt-build` as standalone commands — **pass** (diff: lines 126–127 updated)
- [x] `## Upgrading insight-flow` in README with 3-step `bulk-*` workflow — **pass** (full section present in diff)
- [x] `### Batch operations` subsection removed from `## Multi-project launcher` — **pass** (removed in diff)
- [x] `package.json` version is `0.11.1` — **pass**
- [x] `CHANGELOG.md` has `## [0.11.1]` entry — **pass** (entry documents the rename with migration note)
- [x] `pnpm build` passes — **pass** (verified during implementation, build output `0.11.1`)
- [x] `bulk-init < /dev/null` → `X/Y succeeded` — **pass** (4/4 succeeded)
- [x] `bulk-prompt-build < /dev/null` → `X/Y succeeded` — **pass** (4/4 succeeded)
- [x] `insight-flow help` shows `bulk-*` entries — **pass**
- [x] `batch-ui --init < /dev/null` falls through to UI launcher — **pass** (launches servers, no init triggered)

## Non-blocking

1. **Task title in tracker JSON** — `tasks-N60-N69.json` still has `"title": "promote batch-init and batch-prompt-build to top-level commands"` for N66 (the tracker title was not updated when the spec was amended). Cosmetic only — the tracker title is user-facing but doesn't affect runtime.

2. **README code fence spacing** — In the 3-step snippet, `bulk-init` has uneven spacing before the inline comment vs `bulk-prompt-build`. Purely cosmetic, not worth a fix commit.

## Security & edge cases

No concerns. `bulk-init` / `bulk-prompt-build` delegate directly to `cmdBatchInit` / `cmdBatchPromptBuild` — no new exec paths.

## Notes

- `batch-init` / `batch-prompt-build` were only live in v0.11.0 for one day so the breaking rename is acceptable.
- CHANGELOG migration note ("update any scripts or aliases") is correct and sufficient.
- Follow-up: release v0.11.1 after merge.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

approved merge it and publish then
