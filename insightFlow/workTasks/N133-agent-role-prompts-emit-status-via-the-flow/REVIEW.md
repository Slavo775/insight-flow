# N133 — Agent role prompts emit status via the flow — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

Closes the loop: a `status-transition` module renders into the agent prompt as an
"## Advance the flow" instruction (`composeAgent` maps it to a synthetic
section), and the new `advance --id --agent` command reads the agent's transition
target via `transitionTargetFor` and writes it through the N131 setter. Shipped
agents carry no transition modules → default role Markdown byte-identical
(`sync-roles`: 0 changes; compose drift green).

## Checklist verification

- [x] Transition wording/target derive from the module via N131 — `transitions.test.mjs`.
- [x] Custom-flow agent emits the flow's custom status (e2e advance → custom status, flow-validated).
- [x] Shipped agents have no advance wording (default parity); no-transition-module → clean error.
- [x] Role templates in sync (`sync-roles` reports no changes).

## Blockers

None.

## Non-blocking

- `transitionTargetFor` prefers an agent-named + `from`-matching module, then any `from`-matching one. If an agent carries multiple status-transition modules with overlapping guards, the first match wins (declaration order) — fine, but worth documenting for authors.
- `composeAgent` renders one "## Advance the flow" block per transition module; an agent with several would repeat the heading. Cosmetic.

## Security & edge cases

- `advance` validates through N131, so the module's `sets` must be a status of the task's flow — a misconfigured transition fails loudly rather than writing an invalid status. The `<task-id>` placeholder in the rendered prompt is inert text (no injection surface).

## Notes

Final task — full custom statuses are now self-driving end-to-end.

---

## Discovered (separate from this PR)

`review-start`'s REVIEW.md scaffolder (`scaffoldReviewMd`) writes to a doubled
path under the N101 `insightFlow/` layout — REVIEW.md landed in
`insightFlow/workTasks/workTasks/<task>/`. Reproduces on both the global and a
freshly-built local CLI, so it's a current code bug, not a stale binary. Verdict
bookkeeping (`reviews.json` + status) is unaffected; only the markdown scaffold
is misplaced. These REVIEW.md files were written to the correct folders manually.
Recommend a follow-up fix/incident.


## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-16
**Verdict:** Approved

### Notes

Human: "done create or via girhub and merge it into master"

Approved by the project owner; merging PR #99 into `main`.
