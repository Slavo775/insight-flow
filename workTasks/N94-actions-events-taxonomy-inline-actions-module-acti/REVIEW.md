# N94 — Actions/events taxonomy — inline actions module + activity hooks via emitter — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**PR:** https://github.com/Slavo775/insight-flow/pull/70
**Verdict:** approved

## Summary

Taxonomy rework (PR #70, `d473d70`): Part A replaces the `events` include + `AGENT_EVENTS.md` with the inline `actions` section module (markers in-body; opt-out becomes marked-block stripping per role file); Part B turns the 6 lifecycle hooks into `activity/*` hook modules with script content canonical in module JSON, installed via the emitter (per-agent manifest, `__INSIGHT_FLOW_BIN__` templating, **adoption** of pre-manifest entries). Verified during review: role-file diff is exactly include-line → inlined block per file; live playground migration kept hook-group count stable with the user hook intact and a fully idempotent second run; fresh-consumer init with `phaseMarkers: false` scaffolds roles with zero marker references. Two deviations were disclosed in the PR and hold up (notify stays user-level; `detectActivityHookStatus` guards an unmigrated hook). Verdict: **approved**.

## Checklist verification

- [x] `actions` module carries the full former file content incl. markers; `events` deleted — pass
- [x] 9 agents swapped; regenerated; diff = include → block only — pass (verified per-file)
- [x] AGENT_EVENTS.md gone from root/templates/init; legacy consumer files tolerated (blank-on-strip) — pass
- [x] `phaseMarkers: false` strips the block per role file — pass (live fresh-init smoke)
- [x] `activity/*` modules with descriptions + scripts; browsable — pass
- [x] Emitter: script files 0755, per-agent manifest, removal; vars substitution — pass (unit + live)
- [x] Bespoke installer delegating; version 3 documented — pass
- [x] Cross-agent regression — pass (test + live migrate)
- [x] Gates: build ✅ · suite ✅ · lint baseline ✅ · compose-apply all `unchanged`

## Blockers

None — approved.

## Non-blocking

1. **The in-content heading changed `EVENTS` → `ACTIONS`** — a deliberate, on-taxonomy prompt change, but strictly more than "inline as-is"; it's visible in all 10 role files. Flagged so the human consciously acks the rename at the gate.
2. **Adoption strips user-made exact duplicates** of a managed hook entry (same event+matcher+command). An identical duplicate is functionally meaningless, so acceptable — documented here.
3. `stripPhaseMarkers` assumes the block sits at end-of-file (true for all generated roles); if a future role placed it mid-file, the whitespace normalization could eat one separating blank line. Fine today; worth a comment if module order ever changes.

## Security & edge cases

- Hook scripts are written 0755 from registry data; no user input reaches script paths (names schema-validated). Var substitution is token-replacement only, no shell evaluation at emit time.

## Notes

- The deviations (notify user-level, hookStatus untouched) are the right calls — forcing notify into shared settings would impose notifications on collaborators.
- Same-session implementer/reviewer caveat applies; human gate on PR #70.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-12
**Verdict:** approved

### Summary

Batch approval of N93–N97 with instruction to merge the full PR stack (incl. the AI-flagged EVENTS→ACTIONS heading rename, acked by this approval). Human's exact comment:

> please approved all of this task create invoke task git and merge via gh all 6 mrs

### Blockers

None — approved.

### Notes

- Merged via /task-git as part of the #69→#74 stack.
