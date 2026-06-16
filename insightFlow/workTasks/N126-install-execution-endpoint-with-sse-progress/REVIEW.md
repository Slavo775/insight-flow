# N126 — Install execution endpoint with SSE progress — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`POST /api/flow-install` runs the plan via the idempotent `applyArtifacts`
emitter under the flow's manifest bucket, emits `install-progress` SSE frames
(started / per-step / done / failed), and returns the authoritative reports.
Body size is capped (16 KB). Idempotency is verified.

## Checklist verification

- [x] Writes .mcp.json / hooks / skills idempotently; re-run reports unchanged — `custom-defs-api.test.mjs`.
- [x] SSE progress per step; failure path emits `failed` + 500.
- [x] Unknown flow → 404.

## Blockers

None.

## Non-blocking

- The per-step SSE frames fire in a tight synchronous loop just before the response, so "progress" is effectively instantaneous — fine, but see N127 for the consumer-side implication (the live view rarely observes intermediate steps).

## Security & edge cases

- `applyArtifacts` is atomic per agent and refuses to overwrite a differing mcp/skill (throws → 500), so a conflicting install fails loudly rather than clobbering. Body cap prevents unbounded reads.

## Notes

Pairs with N125 (plan) and N127 (UI).


## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-16
**Verdict:** Approved

### Notes

Human: "done create or via girhub and merge it into master"

Approved by the project owner; merging PR #99 into `main`.
