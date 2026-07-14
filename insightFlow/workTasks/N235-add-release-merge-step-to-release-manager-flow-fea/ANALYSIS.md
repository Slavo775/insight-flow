# N235 — Add release-merge step to Release Manager flow (feature to master) — Analysis

**Created:** 2026-07-14
**Author:** task-analyze

## Problem framing

- Symptom: shipping N233 needed a manual `/task-git` to commit + merge the feature
  before the Release Manager flow could release anything.
- Cause: release-please is a **two-merge** model. Merge #1 (feature PR → main) makes
  release-please open the version-bump/changelog PR. Merge #2 (that release PR → main)
  tags + publishes. The release flow's `ship` agent only does **#2**; nothing in the
  flow does **#1**. The user wants merge #1 to be part of the release flow.

## Goal

- One new step in `custom:release-manager` that merges the feature's existing PR to
  `main` (triggering release-please), so the whole release runs in one flow with no
  manual `/task-git`. One human gate, kept just before the irreversible npm publish.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — New `custom:task-release-merge` agent (reuse `task-git/*` modules), placed plan→merge→ship | Clean separation; each irreversible act has its own node + gate; matches how `ship` already reuses git modules; no locked-handover conflict | One new agent + 2 handovers + 1 status + flow edit | Small |
| B — Fold merge #1 into `ship` | Fewest nodes; ~modules already present | `ship` becomes heavy: two merges + async wait for release-please + publish under one `when`; overloaded | Small–med |
| C — Reuse the built-in `task-git` **agent** as the node | No new agent | Carries a **locked** `pushed → task-review` handover → dangling/foreign edge in the release flow; native `pushed`/`merged` statuses don't fit; can't strip the locked edge | Blocked |

## Decision

- Chosen option: **A** (user-approved).
- Rationale: separation of concerns, minimal blast radius, reuses proven built-in git
  **modules** by reference (never the whole `task-git` agent, which drags a locked
  review handover). Gate placement: user confirmed features are **already reviewed**
  before this flow, so `plan → merge` is **auto** and the single human gate is
  `merge → ship` (right before npm publish, after the changelog is visible). Merge
  scope: **merge existing PR only** (the feature came through the normal review + git
  flow); the `task-git/workflow-merge` no-PR guard is the intended safety stop.

## Open questions

- `[non-blocking]` The merge agent stops (via `task-git/workflow-merge`) if the task
  has no PR. Intended: start the release flow only on an already-committed, PR'd,
  reviewed feature; otherwise run the normal flow's `/task-git` first. User agreed.
- `[non-blocking]` Optional `merging` in-progress status (mirroring `publishing` /
  `fixing`) for dashboard visibility — implementer may add or skip.

## Sources

- None — discussion was self-contained. All definitions inspected live via the
  composer MCP registry (`custom:release-manager` rev `6ccce95810552a6a`,
  `custom:task-release-ship`, `custom:task-release-plan`, `custom:handover-plan-to-ship`,
  `task-git/*` modules, built-in `task-git` agent). Grounded in this session's real
  release of N233/N234.

## Handoff brief

- Title: "Add release-merge step to Release Manager flow (feature to master)" · type
  feat · priority medium · tags composer, release-flow, flow-authoring. Scope: add a
  new `custom:task-release-merge` agent (reusing built-in `task-git/*` merge modules)
  between `plan` and `ship` in `custom:release-manager`; it merges the feature's
  existing PR to `main` to trigger release-please, then hands (gated) to `ship`. New
  handovers `custom:handover-plan-to-merge` (auto) + `custom:handover-merge-to-ship`
  (gated) and new status `feature-merged`; edit the plan agent to swap its handover.
  Harness Claude; activity already on at the flow level.
