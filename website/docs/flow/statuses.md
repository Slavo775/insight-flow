---
title: Statuses
sidebar_label: Statuses
sidebar_position: 2
---

# Task statuses

A task always holds exactly one status. The default flow uses the following set
(defined canonically in `packages/taskflow/src/core/statuses.ts`).

## Core lifecycle

| Status | Meaning |
|--------|---------|
| `ready` | Spec written; ready to be picked up for implementation. |
| `in-progress` | Implementation has started. |
| `implemented` | Implementation complete; awaiting git/push and review. |
| `reviewing` | Under code review (AI or human). |
| `approved` | Review passed with no blockers. |
| `fix-needed` | Review found blockers; needs fixing. |
| `fixing` | Blocker fixes in progress. |
| `fixed` | Fixes applied; ready to be re-reviewed. |
| `pushed` | Changes pushed to the task's branch. |
| `merged` | Branch merged to the main line. **Terminal.** |
| `done` | Task fully complete and closed out. **Terminal.** |

## Change-request states

Used when a human requests changes **after** a task is delivered:

| Status | Meaning |
|--------|---------|
| `request-changes` | A change request is being recorded. |
| `changes-requested` | Change(s) recorded; awaiting implementation. |
| `changes-implementing` | Requested changes are being implemented. |
| `changes-implemented` | Requested changes complete; back to git/review. |

## Terminal vs. active

`merged` and `done` are marked **terminal** — a task in those states has reached the
end of the flow. Every other status is "active" and has at least one outgoing
transition (see [Transitions & agents](./transitions.md)).

:::tip
Incidents are **not** task statuses — they have their own lifecycle attached to a
task. See [Incident flow](./incident-flow.md).
:::
