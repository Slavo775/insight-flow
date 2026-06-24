---
title: /task-incident
sidebar_label: Incident
sidebar_position: 10
---

# /task-incident — Incident handler

**Command:** `/task-incident` · **Role file:** `TASK_INCIDENT_ROLE.md`

Handles production incidents on the task they relate to: investigate, apply a
production fix, and document the root cause. Production problems are redirected here
rather than filed as new tasks.

## What it does

- Opens and tracks an incident through its lifecycle:
  `reported → investigating → production-fix → fixed → verified → closed`.
- Records root cause and fix on the task's `incidents.json` side file.

## In the flow

Incidents are a **side-flow** — they have their own status machine and don't change
the task's main status. See [Incident flow](../flow/incident-flow.md).

## Related CLI

[`incident-create`, `incident-status`, `incident-resolve`, `incident-list`](../cli/incidents.md)
· full prompt: [Reference → TASK_INCIDENT_ROLE.md](../reference/TASK_INCIDENT_ROLE.md).
