---
title: Git & Flow
sidebar_label: Git & Flow
sidebar_position: 7
---

# Git & Flow

Push, record PRs, merge, and manage which flow a task follows. The git steps are
driven by the [`/task-git`](../agents/task-git.md) agent.

:::note 🤖 Agent-driven
`/task-git` runs the push/PR/merge commands for you. The flow-control commands
(`set-flow`, `set-default-flow`) are the ones you're more likely to run yourself.
:::

## Git & merge

| Command | Purpose |
|---------|---------|
| `push` | Push to the task's branch and update the tracker. Flags: `--id`, `--commit`, `--message`, `--branch`. |
| `mr-update` | Record the PR/MR URL on the task. Flags: `--id`, `--url`. |
| `merge` | Merge the branch to the main line. Flag: `--id`. |
| `done` | Mark the task complete. Flag: `--id`. |

## Flow control

| Command | Purpose |
|---------|---------|
| `advance` | Advance a task along its flow via an agent's transition. Flags: `--id`, `--agent`. |
| `set-flow` | Reassign a task to a different flow. Flags: `--id`, `--flow`. |
| `set-default-flow` | Make a flow the default for new tasks. Flag: `--flow`. |

## Example

```bash
insight-flow push      --id N42 --message "feat: add auth" --branch feat/N42-auth
insight-flow mr-update --id N42 --url https://github.com/owner/repo/pull/123
insight-flow merge     --id N42
insight-flow done      --id N42
```

See [Transitions & agents](../flow/transitions.md) for how these commands map to
flow handovers.
