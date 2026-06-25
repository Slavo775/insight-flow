---
title: Default Flow
sidebar_label: Overview
sidebar_position: 1
---

# The default flow

A **flow** defines the lifecycle a task moves through — the set of statuses it can
hold and which [agent](../agents/index.md) acts at each boundary. insight-flow
ships a built-in flow named **`default`** that covers the full path from a fresh
task to a merged, done change, plus side-paths for post-approval changes and
production incidents.

You can reassign a task to another flow (`insight-flow set-flow`) or make a
different flow the default for new tasks (`insight-flow set-default-flow`), but the
`default` flow is what you get out of the box.

## The happy path

```
ready → in-progress → implemented → reviewing → approved → pushed → merged → done
```

Each arrow is a transition performed by an agent calling a CLI lifecycle command
(for example `implement-start`, `review-end`, `merge`). When a review finds
problems, the task branches into the fix loop instead of moving forward.

## The fix loop

```
reviewing ──fix-needed──▶ fixing ──▶ fixed ──▶ (re-review)
```

A `fix-needed` verdict (from AI or human review) sends the task to
`task-review-fix`, which applies fixes and returns it to review.

## Side-flows

- **Change requests** — after a task is `done`, a human can request post-delivery
  changes: `request-changes → changes-requested → changes-implementing →
  changes-implemented`. See [Change-request flow](./change-request-flow.md).
- **Incidents** — production problems are tracked on the owning task with their own
  status machine. See [Incident flow](./incident-flow.md).

## In this section

- **[Statuses](./statuses.md)** — every task status, with meaning.
- **[Transitions & agents](./transitions.md)** — who moves the task where.
- **[Change-request flow](./change-request-flow.md)** — post-approval changes.
- **[Incident flow](./incident-flow.md)** — production incident tracking.

:::note Source of truth
The default flow is defined in `packages/taskflow/src/agents/project/default.json`;
the canonical status list lives in `packages/taskflow/src/core/statuses.ts`.
:::
