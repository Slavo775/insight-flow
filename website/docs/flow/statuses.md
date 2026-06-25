---
title: Statuses
sidebar_label: Statuses
sidebar_position: 2
---

# Task statuses

A task always holds exactly one status. The **default flow** uses the canonical
set below (defined in `packages/taskflow/src/core/statuses.ts`). These are not the
only possible statuses — a [custom flow](../guides/custom-flow.md) can declare its
own status universe (see [Custom statuses & state aliases](#custom-statuses--state-aliases)).

## Core lifecycle

| Status        | Meaning                                                 |
| ------------- | ------------------------------------------------------- |
| `ready`       | Spec written; ready to be picked up for implementation. |
| `in-progress` | Implementation has started.                             |
| `implemented` | Implementation complete; awaiting git/push and review.  |
| `reviewing`   | Under code review (AI or human).                        |
| `approved`    | Review passed with no blockers.                         |
| `fix-needed`  | Review found blockers; needs fixing.                    |
| `fixing`      | Blocker fixes in progress.                              |
| `fixed`       | Fixes applied; ready to be re-reviewed.                 |
| `pushed`      | Changes pushed to the task's branch.                    |
| `merged`      | Branch merged to the main line. **Terminal.**           |
| `done`        | Task fully complete and closed out. **Terminal.**       |

## Change-request states

Used when a human requests changes **after** a task is delivered:

| Status                 | Meaning                                         |
| ---------------------- | ----------------------------------------------- |
| `request-changes`      | A change request is being recorded.             |
| `changes-requested`    | Change(s) recorded; awaiting implementation.    |
| `changes-implementing` | Requested changes are being implemented.        |
| `changes-implemented`  | Requested changes complete; back to git/review. |

## Terminal vs. active

`merged` and `done` are marked **terminal** — a task in those states has reached the
end of the flow. Every other status is "active" and has at least one outgoing
transition (see [Transitions & agents](./transitions.md)). A custom flow marks its
own end states with the `terminal` flag on a status (see below) — terminal is a
property of a status, not a separate kind of thing.

## Custom statuses & state aliases

The statuses above are the **default flow's** set. A custom flow can extend or
replace them with two distinct, independent mechanisms (defined in the flow
schema, `packages/taskflow/src/core/schema/index.ts`):

### Custom status universe — `statuses` (N128)

A flow may declare its own `statuses` array — the **actual values a task can hold**
in that flow. Each entry is:

| Field      | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `id`       | The status value a task stores in `Task.status` (unique within the flow). |
| `title`    | Display label (badges / Kanban columns).                                  |
| `color`    | Optional badge/column color.                                              |
| `terminal` | Optional — marks an end state (the flow's equivalent of `merged`/`done`). |

If a flow declares an **empty** `statuses` set, it falls back to the canonical
universe above (back-compat for older custom flows). When a flow defines its own
statuses, those — not the canonical list — are what its tasks move through.

### State aliases — `states` (N112)

A flow may also declare `states`: **display aliases that map onto exactly one
canonical status** (each has a `mapsTo`). An alias is a visual / suggestion layer
only — it renames how a status appears (label, badge) **without changing the value
a task actually stores**. At runtime `resolveTrigger`
(`packages/taskflow/src/core/flow-status.ts`) collapses an alias back to its
canonical status, so transitions and next-step suggestions keep working.

:::info statuses vs states
`statuses` changes the **real status universe**; `states` only changes the
**display** of canonical statuses. They're independent — a flow can use either,
both, or neither.
:::

For how to declare these when authoring a flow, see
[Define a custom flow](../guides/custom-flow.md); for the conceptual model, see
[Flows & the lifecycle](../concepts/flows.md).

:::tip
Incidents are **not** task statuses — they have their own lifecycle attached to a
task. See [Incident flow](./incident-flow.md).
:::
