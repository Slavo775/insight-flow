# N160 — SPIKE: hermes-agent as an autonomous backend/provider — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-19
**PR:** (no PR yet)
**Verdict:** APPROVED

## Summary

Research spike — deliverable is a fit-assessment doc (`RESEARCH.md`), no production code. Risk: none (zero `packages/` changes). The doc assesses hermes against insight-flow's model, evaluates MCP-as-vector and the messaging-front-end angle, judges provider-fit, and lands a well-reasoned **NOT NOW** (subsumed by N158 for task-state access and N159 for autonomous execution).

## Checklist verification

- [x] Fit assessment: hermes value-add vs Claude/Cursor/OpenHands — pass
- [x] MCP-as-vector evaluated (does N158 subsume this?) + messaging-front-end angle — pass (subsumed by N158; messaging better as generic notifications/webhook)
- [x] Provider-fit judgment (hermes isn't an editor) — pass (provider not warranted; no editor lifecycle to hook)
- [x] Go/no-go recorded ("not now" acceptable) with reasoning — pass
- [x] No production code / dependency added — pass
- [x] No changes to existing behavior or tests — pass

## Blockers

None.

## Non-blocking

- Good that the doc pins the reasoning so a future "hermes?" question doesn't get re-litigated; the "build as generic webhook, not hermes coupling" guidance is the right framing if it's ever revisited.

## Security & edge cases

- N/A — no code, no dependency, no new surface.

## Notes

- Conclusion ties to N158 (MCP) and N159 (OpenHands): hermes adds nothing those two don't already cover generically.
