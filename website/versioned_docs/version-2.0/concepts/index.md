---
title: How it works
sidebar_label: How it works
sidebar_position: 1
---

# How it works

Understanding-oriented explanations of insight-flow's design — the mental model
behind the commands and the dashboard. If the [CLI](../cli/index.md) and
[Agents](../agents/index.md) tell you *what* the pieces do, this section explains
*why* they fit together the way they do.

:::note Building out
This section is being filled in. The model below is the outline; each concept
will get its own page.
:::

## The mental model

insight-flow is built on one idea: **everything is a module.** From that atom,
three layers emerge:

```
Module  →  Agent  →  Flow
(atom)     (a prompt   (a lifecycle:
           composed     agents wired
           from         together by
           modules)     handovers)
```

- **Modules** are the smallest unit — a prompt section, an `@include`, an MCP
  server, a hook, a skill, a handover rule, or a bundle of other modules.
- **Agents** are composed from an ordered list of modules into a single role
  prompt (the `*_ROLE.md` files / slash commands you run).
- **Flows** wire agents into a lifecycle — a graph of agents connected by
  **handovers** (automatic or gated), with their own set of statuses.
- A **task** is bound to a flow (`Task.flowId`) and moves through that flow's
  statuses as agents hand off to one another.

## Planned pages

- **Everything is a module** — the module kinds and why behavior is data.
- **From modules to agents** — composition, bundles, locked modules.
- **Flows & the lifecycle** — states, edges, entry agents.
- **The handover system** — module-level vs flow-edge handovers; auto vs gated.
- **The install engine** — how a flow becomes files on disk.

## In the meantime

- [Default Flow](../flow/index.md) shows the shipped lifecycle and its statuses.
- [Agents](../agents/index.md) documents each agent's role.
- [Configuration](../configuration.md) covers `flows` and `agents` config.
