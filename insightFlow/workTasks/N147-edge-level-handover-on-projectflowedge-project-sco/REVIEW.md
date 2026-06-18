# N147 — edge-level handover on ProjectFlowEdge (project-scoped, trigger-independent) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds optional `handover: { mode: enum(auto|gated) default gated }` to `ProjectFlowEdgeSchema`, plus the matching `FlowEdge` (core) and `ProjectDto.flow` (client) types. Independent of `on`; back-compat preserved. Clean, minimal, well-tested. Risk: low.

## Checklist verification

- [x] `handover` optional on `ProjectFlowEdgeSchema`, mode enum default gated, independent of `on` — pass
- [x] `FlowEdge` + `ProjectDto.flow` carry `handover?` — pass
- [x] Edges without `handover` validate unchanged — pass (explicit test)
- [x] N142 agent-module handover + canonical globals untouched — pass

## Non-blocking

None.

## Security & edge cases

- No new referential constraints needed; the per-project superRefine still validates only `on`. `mode` is a closed enum.

## Notes

Foundation for N148/N149/N150. Tests in `flow-statuses.test.mjs` (parse with/without handover, default mode).


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the edge-authored-handovers round (N147–N150) and authorized merging via gh.

### Blockers

None.

### Suggestions (non-blocking)

The AI review's N149 `$ARGUMENTS` parity nit is deferred (owner said "done" / merge) — track as a follow-up.

### Notes

Human's exact words: "done please merge it via gh"
