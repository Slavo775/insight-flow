---
title: Transitions & agents
sidebar_label: Transitions & agents
sidebar_position: 3
---

# Transitions & agents

Each transition in the default flow is a **handover**: one agent finishes, sets a
status, and the next agent picks the task up. The table below is the full set of
handovers defined in `packages/taskflow/src/agents/project/default.json`.

| From agent | Triggering status | Hands to | Via |
|------------|-------------------|----------|-----|
| `/task-analyze` | _(entry)_ | `/taskmaster` | analysis handoff |
| `/taskmaster` | `ready` | `/task-implement` | `implement-start` |
| `/taskmaster-change` | `ready` | `/task-implement` | `implement-start` |
| `/task-implement` | `implemented` | `/task-git` | `implement-end` |
| `/task-git` | `pushed` | `/task-review` | `push` |
| `/task-review` | `approved` | `/task-human-review` | `review-end --verdict approved` |
| `/task-review` | `fix-needed` | `/task-review-fix` | `review-end --verdict fix-needed` |
| `/task-review-fix` | `fixed` | `/task-review` | `fix-end` |
| `/task-human-review` | `approved` | `/task-git` | `review-end --verdict approved` |
| `/task-human-review` | `fix-needed` | `/task-review-fix` | `review-end --verdict fix-needed` |
| `/task-human-review` | `done` | `/task-request-changes` | `review-end --verdict done` |
| `/task-request-changes` | `changes-requested` | `/task-implement` | `change-request` |
| `/task-implement` | `changes-implemented` | `/task-git` | `change-end` |

## Reading the table

- **From agent** — the agent that completes a phase.
- **Triggering status** — the status it sets when finishing.
- **Hands to** — the agent expected to act next.
- **Via** — the CLI lifecycle command that records the transition.

## Driving transitions

Agents call the lifecycle commands directly. The CLI also exposes a generic
`insight-flow advance --id Nxx --agent <agent>` that advances a task along its
flow's transition for that agent (see the [CLI: Git & flow](../cli/git-and-flow.md)
group).

:::note
The `default.json` flow binds *agents* to *status transitions* as data — this is
the "behavior-as-data" model. Editing the flow (in the dashboard's flow editor or
the JSON) changes the lifecycle without code changes.
:::
