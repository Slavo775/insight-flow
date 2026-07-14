# N235 — Add release-merge step to Release Manager flow (feature to master)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-14

## Description

A composer FLOW change. Add one new step to the custom Release Manager flow
(`custom:release-manager`) so the whole release runs in one flow, with no manual
`/task-git`. A new agent `custom:task-release-merge` merges the feature's already-
open PR into `main` (which triggers release-please), then hands to `ship`.

## Problem

- Releasing with release-please needs **two** merges to `main`: (#1) the **feature
  PR** → main, which makes release-please open the version-bump/changelog PR; and
  (#2) the **release-please PR** → main, which tags + publishes to npm.
- The flow's `ship` agent already does merge **#2**. Merge **#1** is missing — so
  today the feature must be merged by hand (`/task-git`) before the release flow
  can do anything. This was the exact gap hit shipping N233.

## Goal

1. Add a `custom:task-release-merge` agent that merges the feature's existing PR to
   `main` and confirms release-please opened its release PR, then sets a new status
   `feature-merged`.
2. Wire it into `custom:release-manager` between `plan` and `ship`: `plan → merge`
   (auto), `merge → ship` (gated — the single human gate before npm publish).
3. Keep one human gate, moved to just before publish; no manual `/task-git` needed
   for a normal, already-reviewed feature.

## Scope

### In scope

- New agent `custom:task-release-merge` + new module `custom:task-release-merge-identity`.
- New handovers `custom:handover-plan-to-merge` (auto) and `custom:handover-merge-to-ship` (gated).
- New status `feature-merged` (non-terminal); optional in-progress `merging`.
- Edit flow `custom:release-manager`: add the agent + status, re-point `plan → ship`
  to `plan → merge`, add `merge → ship`.
- Edit agent `custom:task-release-plan`: swap its `custom:handover-plan-to-ship`
  module for the new `custom:handover-plan-to-merge`.

### Out of scope

- Any change to `custom:task-release-ship`'s own merge — it stays as the
  release-please PR merge (#2). Do not touch it.
- The `task-git/*` built-in modules — reuse by reference only; never edit.
- Locked modules (`security` / `enforcement` / `protocol`, built-in handovers).
- Adding the activity engine — already installed at the flow level.
- The feature commit/push/PR itself — the merge agent only merges an existing PR
  (it stops with a clear message if the task has no PR, via `task-git/workflow-merge`).

## Inventory — everything to build or change

### Modules

- `custom:task-release-merge-identity` — kind `section`. **New.** Role text for the
  Release Merger: "merge the approved feature PR into `main` to trigger release-please;
  then confirm release-please opened its release PR; set `feature-merged`. If the task
  has no PR (`mrUrl`), STOP and tell the user to run the normal git flow first." Keep
  it small; one concern.
- `task-git/conventions`, `task-git/permission-gates`, `task-git/git-permissions`,
  `task-git/workflow-merge`, `task-git/safety` — built-in. **Reuse as-is by reference**
  (same set `custom:task-release-ship` already composes).
- `security`, `enforcement`, `protocol`, `actions` — locked baseline. Reuse as-is.

### Agents

- `custom:task-release-merge` — **New.** Ordered `modules`:
  `custom:task-release-merge-identity` → `security` → `enforcement` → `protocol` →
  `task-git/conventions` → `task-git/permission-gates` → `task-git/git-permissions` →
  `task-git/workflow-merge` → `task-git/safety` → `custom:handover-merge-to-ship` →
  `actions`. Sets status `feature-merged`. `command.install: true`. No subagents.
- `custom:task-release-plan` — **Edit.** In its `modules`, replace
  `custom:handover-plan-to-ship` with `custom:handover-plan-to-merge`. No other change.

### Flows

- `custom:release-manager` — **Edit** (custom, editable; pass `revision` from `get`).
  - `agents`: add `custom:task-release-merge`.
  - statuses: add `feature-merged` (non-terminal); optional `merging`.
  - edges: change `plan → ship` (on `ready-to-release`) to `plan → merge`; add
    `merge → ship` (on `feature-merged`).
  - `entryAgents` unchanged (`custom:task-release-check`); terminators unchanged
    (`not-able-to-release`, `done`); `install` unchanged (`activity`).

### Relationships (handovers)

- `custom:handover-plan-to-merge` — **New.** from `custom:task-release-plan` → to
  `custom:task-release-merge`, `on: ready-to-release`, **auto**. `when`: "Feature is
  reviewed and ready; merging the approved PR to main triggers release-please and is
  safe to chain."
- `custom:handover-merge-to-ship` — **New.** from `custom:task-release-merge` → to
  `custom:task-release-ship`, `on: feature-merged`, **gated**. `when`: "Feature is on
  main and release-please prepared the release PR; the next step merges it and
  publishes to npm — unrecallable — so a human approves first."
- `custom:handover-plan-to-ship` — **do NOT edit** (referenced; keep pristine). It is
  simply dropped from the plan agent's module list in favour of the new one.

## Verification

- Every new/edited definition **composes/renders** with no unresolved id
  (`get`/compose the agent + flow via composer MCP; create/update rejects invalid).
- Flow graph is coherent: single entry `check`; path `check → plan → merge → ship →
  rollout → done`; back-edge `fix → check` still gated; both terminators reachable;
  `feature-merged` has exactly one outgoing edge (`→ ship`, gated).
- **Install dry-run** of `custom:release-manager` is sane — emits the new
  `/task-release-merge` command (Claude harness) and no orphan edges.
- Smoke: on a task with an open PR, `plan` (ready-to-release) auto-hands to `merge`;
  `merge` refuses when the task has no PR; `merge → ship` stops for human approval.

## Notes

- Opt-ins: **harness = Claude only**; **activity engine already on** at the flow level
  (do not add per-agent).
- Reuse/impact: `task-git/*` are built-in → reference only. `custom:handover-plan-to-ship`
  is referenced by the plan agent → author the new `custom:handover-plan-to-merge`
  variant instead of editing it.
- Origin: gap found shipping **N233** / release **N234** (feature had to be merged by
  hand with `/task-git`). See `ANALYSIS.md` in this folder for the full design trail.
- Related agents/flow live in the **composer registry** (not the repo tree): inspect
  via composer MCP `get` (`custom:release-manager` rev `6ccce95810552a6a`,
  `custom:task-release-ship`, `custom:task-release-plan`, `custom:handover-plan-to-ship`).
