---
title: Define a custom flow
sidebar_label: Custom flow
sidebar_position: 6
---

# Define a custom flow

A [flow](../concepts/flows.md) (a "project" definition on disk) declares which
agents a lifecycle uses, how they connect (edges), its status set, and which
agents can start it. This guide authors a custom flow and binds task types to it.

## 1. Write the flow definition

User-space flows live under `insightFlow/projects/`, one JSON file per flow. The
id starts with `custom:` and a lowercase slug.

`insightFlow/projects/hotfix.json`:

```json
{
  "id": "custom:hotfix",
  "title": "Hotfix flow",
  "description": "A short lifecycle for urgent fixes.",
  "agents": ["task-implement", "task-git"],
  "entryAgents": ["task-implement"],
  "statuses": [
    { "id": "ready", "title": "Ready" },
    { "id": "in-progress", "title": "In progress" },
    { "id": "implemented", "title": "Implemented" },
    { "id": "merged", "title": "Merged", "terminal": true }
  ],
  "flow": [
    { "from": "task-implement", "to": "task-git", "on": "implemented" },
    { "from": "task-git", "to": "merged", "on": "merged" }
  ],
  "install": []
}
```

What the loader checks (same Zod schema as the built-in default flow):

- **`agents`** — every id must resolve to a composed agent (built-in or your own
  `custom:` agent).
- **`entryAgents`** — must be a subset of `agents`. Invoking an entry agent binds
  a new task to this flow.
- **`statuses`** — each `id` is a value a task can store; unique within the flow;
  mark end states `terminal`. An empty set falls back to the canonical status
  universe.
- **`flow`** edges — `from` must be a declared agent; `to` must be a declared
  agent **or** a declared terminal status. `on` (the trigger) must be one of the
  flow's statuses/states. Duplicate `(from, to, on)` triples throw.
- **`install`** — module/bundle ids installed at flow level (see
  [the install engine](./install-engine.md)).

## 2. Bind task types to the flow

A task picks its flow in this order: an explicit entry-agent match, then the
`flows.byType` map for the task's type, then `flows.defaultFlow`. To route, say,
all `fix` tasks through your hotfix flow, edit `taskflow.config.json`:

```jsonc
// taskflow.config.json
{
  "flows": {
    "defaultFlow": "default",
    "byType": { "fix": "custom:hotfix" },
  },
}
```

To make a custom flow the binding **default** for every new task (no `entryAgents`
needed), use the command — it writes `flows.defaultFlow` for you, preserving
`byType`:

```bash
insight-flow set-default-flow --flow custom:hotfix
```

## 3. Verify

Create a task of the bound type and confirm it picks up the flow:

```bash
insight-flow create --title "Patch the login bug" --type fix
insight-flow show --id Nxx --summary
```

The task's `flowId` reads `custom:hotfix`. You can also reassign a single
**ready** task to a flow at any time:

```bash
insight-flow set-flow --id Nxx --flow custom:hotfix
```

The dashboard's flow map renders the lifecycle with the task's current state
highlighted.

## See also

- [Author a custom module](./custom-module.md) ·
  [Compose a custom agent](./custom-agent.md)
- [The install engine](./install-engine.md) — install a flow's modules.
- [Concepts → Flows](../concepts/flows.md) ·
  [Handover](../concepts/handover.md)
- [Configuration → `flows`](../configuration.md)
