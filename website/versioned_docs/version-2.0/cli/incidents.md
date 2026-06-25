---
title: Incidents
sidebar_label: Incidents
sidebar_position: 8
---

# Incidents

Track production incidents against the task they relate to. See the
[incident flow](../flow/incident-flow.md) and the
[`/task-incident`](../agents/task-incident.md) agent.

:::note 🤖 Agent-driven
`/task-incident` calls these for you. You usually don't run them by hand.
:::

| Command | Purpose |
|---------|---------|
| `incident-create` | Open an incident on a task. Flags: `--id`, `--title`, `--severity critical\|high\|medium\|low`. |
| `incident-status` | Update an incident's status. Flags: `--id`, `--incident`, `--status investigating\|production-fix\|verified\|closed`. |
| `incident-resolve` | Resolve an incident with root cause + fix. Flags: `--id`, `--incident`, `--rootCause`, `--fix`. |
| `incident-list` | List incidents on a task. Flag: `--id`. |

## Example

```bash
insight-flow incident-create  --id N42 --title "Login 500s" --severity high
insight-flow incident-status  --id N42 --incident 1 --status investigating
insight-flow incident-resolve --id N42 --incident 1 \
  --rootCause "Null session on cold start" --fix "Guard + warm cache"
insight-flow incident-list    --id N42
```
