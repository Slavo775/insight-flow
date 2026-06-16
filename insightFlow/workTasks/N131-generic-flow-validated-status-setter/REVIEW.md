# N131 — Generic flow-validated status setter — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`core/set-status.setStatus(task, target, opts, flow?)` validates the target
against the flow's status universe (declared set, else canonical) then writes
status + statusHistory; out-of-set → `InvalidStatusTransitionError`. All 12
lifecycle transitions route through `writeStatus` (resolves the flow
defensively). The generic `status` command, incidents, and create's initial
literal stay inline — exactly the right escape hatches. The CLI top-level handler
prints the error cleanly. This is the riskiest slice and it's handled carefully.

## Checklist verification

- [x] Gating by the flow's universe; lifecycle routed; default byte-identical — `status-setter.test.mjs` (incl. e2e create→implement→push→merge).
- [x] Out-of-graph transitions rejected, task left unmutated.
- [x] Task.status validated relative to its flow, not a global enum.
- [x] Audit confirms no missed/double `task.status =` writes in the routed commands.

## Blockers

None.

## Non-blocking

- **Fail-open on registry error:** `writeStatus` resolves the flow via `mergedProjects()` inside try/catch → `undefined` → canonical universe. So a malformed *custom* def silently disables flow validation for *all* tasks (even custom-flow ones) until fixed. This is the safer default (never block the lifecycle), but a one-line stderr warning on the catch would make the degradation visible.
- **Tightened invalid-input path:** on the default flow, a non-canonical `--verdict`/literal that the old free-form write accepted is now rejected. Valid canonical transitions are byte-identical; only the garbage-input path changed (a safety improvement). The generic `status` command remains the unvalidated escape hatch.
- `mergedProjects()` (disk read + full user-def validation) now runs on every lifecycle write — negligible for a one-shot CLI invocation.

## Security & edge cases

- Validation happens before any mutation, so a rejected transition cannot leave a half-written task. `merge`/`done`/`push` on a custom flow that doesn't declare those statuses will (correctly) reject — custom flows must declare the statuses their lifecycle uses.

## Notes

Foundation for N132/N133. The fail-open warning is the only thing I'd add.
