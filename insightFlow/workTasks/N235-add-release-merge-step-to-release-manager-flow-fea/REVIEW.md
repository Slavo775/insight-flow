# N235 — Add release-merge step to Release Manager flow (feature to master) — Review

**Reviewer:** Composer Reviewer (ai) — module / agent / relationship / flow reviewers
**Date:** 2026-07-14
**PR:** (composer definitions — no PR)
**Verdict:** approved

## Summary

Reviewed the 6 authored/edited composer definitions that add a "merge feature to
master" step to `custom:release-manager`. Four per-kind reviewers (module, agent,
relationship, flow) all returned PASS. Low risk: the merge behavior is entirely
reused built-in `task-git/*` modules; only small custom glue is new. Nothing is
installed, so the live flow is unchanged until the gated Installer step. **Approved.**

## Checklist verification

- [x] Module `custom:task-release-merge-identity` — PASS (valid `section`, role text matches, minimal, no collision).
- [x] Agent `custom:task-release-merge` — PASS (baseline order correct; all 11 modules resolve; reuses `task-git/*` by reference; merge-only, no push/PR; no agent-level activity).
- [x] Agent `custom:task-release-plan` edit — PASS (handover swapped in the same slot; nothing else changed; `handover-plan-to-ship` left intact).
- [x] Handovers `custom:handover-plan-to-merge` (auto) + `custom:handover-merge-to-ship` (gated) — PASS (clear `when`; the load-bearing `merge→ship` gate before npm publish is correctly gated; single-token; no cycle back-edge).
- [x] Flow `custom:release-manager` — PASS (entry `check`; path check→plan→merge→ship→rollout→done resolves; old `plan→ship` edge gone; `feature-merged` has one outgoing edge; both terminators reachable; `activity` retained).

## Blockers

None.

## Non-blocking

1. **Orphaned module `custom:handover-plan-to-ship`.** After the swap, no agent
   composes it (plan now uses `plan-to-fix` + `plan-to-merge`). It is harmless (an
   unused definition), and it was deliberately left intact per the spec. Optional
   cleanup: delete it later if you don't want to keep a `plan→ship` shortcut around.
2. **Identity module folds identity + full workflow into one `section`.** Sibling
   release roles split identity from role/workflow. Consistency nit only; the single
   module is actually more minimal.
3. **Merge agent omits `task-git/input-contract` and `task-git/edge-cases`.** Looks
   intentional (the custom identity supplies the contract; merge has fewer edge
   cases). Worth a glance that the identity covers the merge edge cases you care about.

## Security & edge cases

- No security concerns. The merge agent composes `task-git/permission-gates` +
  `task-git/git-permissions` + `task-git/safety`, so the git merge stays behind the
  same permission/no-force-push guards as the rest of the flow. Locked baseline
  (`security`/`enforcement`/`protocol`) untouched. The no-PR STOP rule (via
  `task-git/workflow-merge`) is the intended safety stop for an uncommitted task.

## Notes

- Nothing installed — this is definition authoring only. The updated flow goes live
  only when the Installer (`/task-authoring-install`, gated) installs it.
- Origin: gap found shipping N233 / release N234 (feature merged by hand). See
  ANALYSIS.md.
- Reviewed via composer MCP `get` (read-only): flow rev `99aa4537b451f17f`, agent
  `custom:task-release-merge` rev `f5348a405e01acf7`, plan rev `6004e488ffd2c2db`.
