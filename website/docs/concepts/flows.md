---
title: Flows & the lifecycle
sidebar_label: Flows & the lifecycle
sidebar_position: 4
---

# Flows & the lifecycle

A **flow** is the top tier of the model: it takes a set of [agents](./agents.md)
and wires them into a lifecycle. Where an agent is a list of modules, a flow is a
project definition — validated by `ProjectSchema` in
`packages/taskflow/src/core/schema/index.ts`. A flow has five parts:

| Field          | Meaning                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `agents`       | The composed-agent ids this flow uses.                                         |
| `flow` (edges) | Relations `{ from, to, on?, handover? }` — who hands to whom, on which status. |
| `install`      | Module/bundle ids installed at the project level (hooks, skills, MCP).         |
| `statuses`     | The flow's own ordered status set — the universe a task can be in.             |
| `entryAgents`  | The main agent(s); invoking one binds a new task to this flow.                 |

## Edges describe the lifecycle

Each edge `{ from, to, on }` reads: _"when the task reaches status `on`, agent
`from` hands over to `to`."_ A task sitting in a trigger status is therefore _at_
its producing agent (`from`), and the consuming agents (`to`) are the suggested
next steps. This mapping is pure and derived entirely from the flow definition —
there is no hardcoded status table (`packages/taskflow/src/core/flow-status.ts`).
An edge may also carry a `handover` (project-scoped) — see
[the handover system](./handover.md).

## Statuses are the flow's own

`statuses` is the flow's status universe — each entry has an `id` (the value a
task stores in `Task.status`), a display `title`, an optional `color`, and an
optional `terminal` flag for end states. The shipped default flow declares the
canonical status set verbatim, so its behavior is byte-identical to the built-in
lifecycle. A flow that declares no statuses falls back to the canonical universe
(back-compat for older custom flows). Flows may also declare `states` — display
aliases that map onto exactly one canonical status, a visual/suggestion layer
only.

## How a task binds: `Task.flowId`

A task records its flow in `Task.flowId` — `"default"` or `"custom:<slug>"`. The
binding is resolved at create time from the project's
[`flows` config](../configuration.md#flows--task--flow-binding):

- `flows.byType[<task type>]` is checked first (e.g. route `fix` tasks to
  `custom:hotfix`),
- otherwise `flows.defaultFlow` (which itself defaults to `"default"`),
- an unknown mapped flow falls back to `"default"` (non-fatal).

Invoking an `entryAgent` is the other way a task binds: a command-installed entry
agent stamps `--by <agent-id>` onto its `create` call, which binds the new task
to that agent's flow. Legacy tasks with no `flowId` read back as `"default"` —
zero behavior change. Once bound, the flow's statuses and edges govern how that
task travels.

## The default lifecycle

The shipped flow (`packages/taskflow/src/agents/project/default.json`) is the
canonical lifecycle — strategy → spec → implementation → a review loop → a human
gate, with change-request and incident side-flows. Its entry agents are
`task-analyze` and `taskmaster`:

```
task-analyze ──▶ taskmaster ──(ready)──▶ task-implement
                                              │
                                       (implemented)
                                              ▼
                                          task-git ──(pushed)──▶ task-review
                                                                     │
                                          ┌──────────(approved)──────┤
                                          ▼                          ▼ (fix-needed)
                                 task-human-review            task-review-fix
                                  │       │       │                  │
                          (approved)  (fix-needed) (done)        (fixed)
                                  │       │       │                  │
                                  ▼       ▼       ▼                  ▼
                              task-git  review-fix  task-request-  task-review
                                                     changes
                                                       │
                                              (changes-requested)
                                                       ▼
                                                 task-implement
                                              (changes-implemented)
                                                       ▼
                                                   task-git
```

The review loop (`task-review` ⇄ `task-review-fix`) and the change-request
side-flow (`task-request-changes` → `task-implement` → `task-git`) are both edges
in this same graph. `task-incident` is a declared agent for the incident
side-flow. The flow's `install` list installs the `activity` telemetry bundle.

:::note Descriptive, then prescriptive
The flow's `statuses` and edges are the source of truth the dashboard
visualizes and audits; the status machine and the `next*` pickers enforce the
canonical lifecycle. Custom flows' own statuses are honored through the data
described above.
:::

## See also

- [The handover system](./handover.md) — auto vs gated, module vs edge handovers.
- [Default flow](../built-ins/default-flow.md) — the shipped flow, edge by edge.
- [Default Flow](../flow/index.md) — statuses and transitions in the dashboard.
- [Configuration](../configuration.md#flows--task--flow-binding) — the `flows`
  config keys.
