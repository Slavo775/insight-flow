---
title: Built-in reference
sidebar_label: Overview
sidebar_position: 1
description: A factual inventory of everything insight-flow ships by default — modules, agents, the default flow, and the master server.
---

# Built-in reference

This group is an **inventory of what insight-flow ships out of the box**. It is
reference material — factual tables, not tutorials. Use it to answer "what is
the `id` of X?", "which modules does this agent compose?", or "what endpoints
does the master server expose?".

For the conceptual model behind these tables — _why_ everything is a module and
how composition works — read the [Concepts](../concepts/index.md) section
instead. For the prose walkthrough of the lifecycle, see the
[Default Flow](../flow/index.md) section.

:::info Source of truth
Every value on these pages is read from the JSON registries under
`packages/taskflow/src/agents/` and the master server under
`packages/taskflow/src/master/`. If a page and the code ever disagree, the code
wins — please open an issue.
:::

## Pages

- **[Default modules](./default-modules.md)** — every shipped module grouped by
  kind: the locked cross-cutting baseline, global singletons, the activity
  integration, testing / langfuse integrations, per-role modules, and the
  handover modules.
- **[Default agents](./default-agents.md)** — the 10 composed agents, each with
  its one-line role and the exact list of module ids it composes.
- **[Default flow](./default-flow.md)** — the `default` project: its agents,
  edges, statuses, entry agents, and install list.
- **[Master hub](./master-server.md)** — the single-origin, installable PWA hub
  that switches between all your projects: reverse-proxy `/project/<id>/`,
  running/stopped switcher, New-project modal, persistent `hub.json` registry,
  liveness, and the security / LAN-mobile model.

## Related

- [Concepts → Everything is a module](../concepts/modules.md)
- [Concepts → Agents](../concepts/agents.md)
- [Concepts → Flows](../concepts/flows.md)
- [Agents](../agents/index.md)
- [Configuration](../configuration.md)
