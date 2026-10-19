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
| `set-flow` | Reassign a task to a different flow. Flags: `--id`, `--flow`. A chained task can only move to a flow of its chain (clear the chain first with `set-chain --chain none`). |
| `set-default-flow` | Make a flow the default for new tasks. Flag: `--flow`. |
| `set-chain` | Bind a task to a chain of flows, or clear it with `none` (only while `ready`). Flags: `--id`, `--chain`. |
| `chain-advance` | At a terminal status, move a chained task into the next flow of its chain at `ready`. Flags: `--id`, `--to` (needed when several links leave that terminal), `--by`. |

## Chains (flow → flow)

A **chain** links existing flows so one task can go through several of them
(for example prepare → implement → deploy-beta). Flows are not changed, so the
same flow can be used in many chains. A chain lives in
`insightFlow/chains/<name>.json`:

```json
{
  "id": "custom:feature-to-beta",
  "title": "Feature to beta",
  "flows": ["custom:prepare", "default", "custom:deploy-beta"],
  "links": [
    { "from": "custom:prepare", "on": "done", "to": "default" },
    { "from": "default", "on": "merged", "to": "custom:deploy-beta", "mode": "gated" },
    { "from": "custom:deploy-beta", "on": "failed", "to": "default", "when": "beta found a bug" }
  ]
}
```

- `flows[0]` is where a new chained task starts (`create --chain <id>`).
- A link leaves a **terminal** status (`on`) of flow `from` and enters flow `to`
  at `ready`. Flow `to` must have an entry agent.
- `mode` is `gated` (default) or `auto`, the same as agent handovers; `when`
  explains when to take the link if several leave the same terminal. `when` is
  one line of at most 200 characters, with no control characters, because it is
  printed inside the `chain next:` line (quoted).
- Deleting a flow that a chain names is refused; so is a flow edit that removes
  a linked terminal status or the entry agent of a linked-to flow.

When a chained task reaches a terminal with links, the status command prints one
`chain next:` line per link on stderr, after the new status is saved:

```text
chain next: flow custom:deploy-beta — run `insight-flow chain-advance --id N42 --to custom:deploy-beta` then `/task-git` (mode: gated)
```
 The agent follows it like a handover:
`gated` waits for your go-ahead, `auto` continues. `chain-advance` then moves the
task, keeps its folder and history, and prints the next flow's entry command.

## Example

```bash
insight-flow push      --id N42 --message "feat: add auth" --branch feat/N42-auth
insight-flow mr-update --id N42 --url https://github.com/owner/repo/pull/123
insight-flow merge     --id N42
insight-flow done      --id N42

insight-flow create --title "Add auth" --chain custom:feature-to-beta
insight-flow chain-advance --id N42 --to custom:deploy-beta
```

See [Transitions & agents](../flow/transitions.md) for how these commands map to
flow handovers.
