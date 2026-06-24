---
title: Incident flow
sidebar_label: Incident flow
sidebar_position: 5
---

# Incident flow

Production problems are tracked as **incidents** attached to the task they relate
to — not as task statuses. Each task carries an incident log (`incidents.json` side
file), and incidents have their own status machine.

## Incident lifecycle

```
reported → investigating → production-fix → fixed → verified → closed
```

| Status | Meaning |
|--------|---------|
| `reported` | Incident created and logged. |
| `investigating` | Root cause being diagnosed. |
| `production-fix` | A fix is being applied to production. |
| `fixed` | Fix applied. |
| `verified` | Fix confirmed to resolve the incident. |
| `closed` | Incident fully resolved and closed. |

## Agent

The **[`/task-incident`](../agents/task-incident.md)** agent handles incidents:
investigate, apply a production fix, and document the root cause. Production
problems are redirected here rather than being filed as new tasks.

## CLI commands

```bash
insight-flow incident-create  --id Nxx --title "..." --severity critical|high|medium|low
insight-flow incident-status  --id Nxx --incident <iid> --status investigating|production-fix|verified|closed
insight-flow incident-resolve --id Nxx --incident <iid> --rootCause "..." --fix "..."
insight-flow incident-list    --id Nxx
```

See the [CLI: Incidents](../cli/incidents.md) group for full flags. A task's open
incident count surfaces on its dashboard card via the `openIncidentCount` summary
field.
