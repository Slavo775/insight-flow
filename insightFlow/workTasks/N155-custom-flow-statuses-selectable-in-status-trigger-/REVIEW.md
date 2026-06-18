# N155 — custom-flow statuses selectable in status/trigger pickers — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

`FlowEditor.TriggerOptions` now offers the flow's own `statuses` (N128) when declared, else canonical; `statuses` added to `ProjectDto` (server already sent it via `...project`). ModuleForm stays canonical-only by design (global modules are flow-agnostic), documented in-code. Both typechecks clean. Risk: low.

## Checklist verification

- [x] `TriggerOptions` lists flow statuses (deduped via the flow-universe model: declared set replaces canonical) + custom states + direct handoff — pass
- [x] ModuleForm pickers: minimal flow-aware behavior chosen (canonical-only) + documented — pass
- [x] Canonical statuses remain available (the empty-`statuses` fallback) — pass
- [x] No schema / task-status-storage change — pass

## Non-blocking

1. For the **default** flow (whose `statuses` IS the canonical enum), the picker now labels the group "Flow statuses" instead of "Canonical statuses" — same values, cosmetic label change. Acceptable.
2. ModuleForm union-of-all-flows was the alternative; canonical-only is the smaller coherent choice and is documented — fine to revisit if authors want flow-specific module triggers.

## Security & edge cases

- `project.statuses` is `FlowStatus[]` (structurally compatible with the `{id,title}` the picker reads); server sends it via `...project`. Verified.

## Notes

Sources N143/N146. Open question (global-module context) resolved minimally + documented in `ModuleForm.tsx`.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the review-follow-ups round (N151–N156) and authorized commit + push + PR + merge via gh.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "please done commit push create PR and merge it via gh"
