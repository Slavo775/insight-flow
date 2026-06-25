---
title: Default flow
sidebar_label: Default flow
sidebar_position: 4
description: The default project flow — its agents, edges, statuses, entry agents, and install list, read verbatim from default.json.
---

# Default flow

The `default` project is the canonical task lifecycle insight-flow ships. It
lives at `packages/taskflow/src/agents/project/default.json` and wires the
[10 composed agents](./default-agents.md) into a graph. This page is the factual
inventory of that file. For the prose walkthrough of the lifecycle — what each
status _means_ and how a task moves through it — read the
[Default Flow](../flow/index.md) section.

```text
id:    "default"
title: "insight-flow default project"
```

---

## Agents

The 10 agents the flow installs (`agents` array):

`task-analyze`, `taskmaster`, `taskmaster-change`, `task-implement`,
`task-review`, `task-review-fix`, `task-human-review`, `task-request-changes`,
`task-incident`, `task-git`.

---

## Edges

The `flow` array — directed hand-offs. An `on` value means the edge triggers
when the task reaches that status; an edge with no `on` is unconditional. (Modes
— gated vs auto — are carried by the underlying handover modules; see
[Default modules → Handover modules](./default-modules.md#handover-modules).)

| from                   | to                     | on                    |
| ---------------------- | ---------------------- | --------------------- |
| `task-analyze`         | `taskmaster`           | —                     |
| `taskmaster`           | `task-implement`       | `ready`               |
| `taskmaster-change`    | `task-implement`       | `ready`               |
| `task-implement`       | `task-git`             | `implemented`         |
| `task-git`             | `task-review`          | `pushed`              |
| `task-review`          | `task-human-review`    | `approved`            |
| `task-review`          | `task-review-fix`      | `fix-needed`          |
| `task-review-fix`      | `task-review`          | `fixed`               |
| `task-human-review`    | `task-review-fix`      | `fix-needed`          |
| `task-human-review`    | `task-git`             | `approved`            |
| `task-human-review`    | `task-request-changes` | `done`                |
| `task-request-changes` | `task-implement`       | `changes-requested`   |
| `task-implement`       | `task-git`             | `changes-implemented` |

---

## Statuses

The `statuses` array — the full status vocabulary, with display color and
terminal flag.

| id                     | color     | terminal? |
| ---------------------- | --------- | --------- |
| `ready`                | `#94a3b8` | —         |
| `in-progress`          | `#f59e0b` | —         |
| `implemented`          | `#06b6d4` | —         |
| `reviewing`            | `#a855f7` | —         |
| `approved`             | `#22c55e` | —         |
| `fix-needed`           | `#ef4444` | —         |
| `fixing`               | `#dc2626` | —         |
| `fixed`                | `#22c55e` | —         |
| `pushed`               | `#16a34a` | —         |
| `merged`               | `#10b981` | **yes**   |
| `done`                 | —         | **yes**   |
| `request-changes`      | —         | —         |
| `changes-requested`    | `#f97316` | —         |
| `changes-implementing` | `#fb923c` | —         |
| `changes-implemented`  | `#14b8a6` | —         |

---

## Entry agents

The `entryAgents` array — where a new task can start:

`task-analyze`, `taskmaster`.

`/task-analyze` runs upstream of the tracker (no task exists yet) and hands off
to `/taskmaster`; you can also start directly at `/taskmaster` when the brief is
already clear.

---

## Install

The `install` array — flow-level artifacts installed when the flow is set up:

`activity` — the activity telemetry bundle (six lifecycle hooks). See
[Default modules → Activity integration](./default-modules.md#activity-integration-telemetry).
