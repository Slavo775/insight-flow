---
title: Tasks & Query
sidebar_label: Tasks & Query
sidebar_position: 3
---

# Tasks & Query

Create tasks and inspect the state of your work.

:::note 🤖 Agent-driven
These are normally run by the agents as they work — `/taskmaster` creates tasks,
`/task-implement` picks the next one, and so on. You usually don't run `create`,
`current`, `next`, `list`, or `stats` by hand; run them when you want to inspect state
or script something.
:::

## Create & edit

| Command | Purpose |
|---------|---------|
| `create` | Create a new task. Flags: `--title`, `--type feat\|fix\|rework`, `--priority high\|medium\|low`, `--tags a,b`, `--with-analysis`. |
| `rename` | Update task metadata. Flags: `--id`, `--title`, `--type`, `--priority`. |
| `status` | Set a task's status directly. Flags: `--id`, `--status`, `--by`. |

## Query

| Command | Purpose |
|---------|---------|
| `current` | Show the active task. |
| `list` | List tasks. Flag: `--status`. |
| `show` | Print a task as JSON. Flags: `--id`, `--summary`, `--spec`. |
| `stats` | Aggregate statistics. Flag: `--tokens`. |

## Pick what's next

| Command | Purpose |
|---------|---------|
| `next` | Pick the next actionable task by priority. Flag: `--with-spec`. |
| `next-review` | Pick the next reviewable task. Flag: `--with-spec`. |
| `next-fix` | Pick the next `fix-needed` task. Flag: `--with-spec`. |
| `next-change` | Pick the next change request. |

## Examples

```bash
insight-flow create --title "Add auth" --type feat --priority high --tags auth,api
insight-flow show --id N42 --spec        # full TASK.md + CHECKLIST.md
insight-flow list --status fix-needed
insight-flow next --with-spec            # next task + its spec, ready to implement
```
