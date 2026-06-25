---
title: How it works
sidebar_label: How it works
sidebar_position: 1
---

# How it works

Understanding-oriented explanations of insight-flow's design — the mental model
behind the commands and the dashboard. If the [CLI](../cli/index.md) and
[Agents](../agents/index.md) tell you _what_ the pieces do, this section explains
_why_ they fit together the way they do.

## One idea: everything is a module

insight-flow is built on a single atom: **everything is a module.** A prompt
section, an `@include` line, an MCP server, a Claude Code hook, a skill, a
handover rule, a status transition, even a _bundle_ of other modules — all of it
is one shape, an entry in a registry, validated by one schema
(`AgentModuleSchema` in `packages/taskflow/src/core/schema/index.ts`).

From that atom, three layers emerge:

```
Module  ──▶  Agent  ──▶  Flow
(atom)       (an ordered    (a lifecycle:
             list of         agents wired
             modules,        together by
             composed into   edges &
             one role        handovers,
             prompt)         with its own
                             statuses)
```

- **[Modules](./modules.md)** are the smallest unit. Some are prompt text
  (`section`, `include`), some are installable artifacts (`mcp-server`, `hook`,
  `skill`), some are pure behavior-as-data (`handover`, `status-transition`),
  and one (`bundle`) is a molecule that groups other modules.
- **[Agents](./agents.md)** are composed from an _ordered list of module ids_
  into a single role prompt — the `*_ROLE.md` files and slash commands you run.
  The composer (`packages/taskflow/src/agents/compose.ts`) walks the list,
  expands any bundles, and renders the text modules in order.
- **[Flows](./flows.md)** wire agents into a lifecycle: a set of agents, the
  `edges` between them, the things they `install`, the `statuses` work moves
  through, and the `entryAgents` that can start work. The shipped default flow
  is the canonical task lifecycle.
- A **task** is bound to exactly one flow. `Task.flowId` (`"default"` or
  `"custom:<slug>"`) records which flow governs it, and the task moves through
  that flow's statuses as agents hand off to one another.

## How a task binds to a flow

When a new task is created, insight-flow resolves its flow from the project's
[`flows` config](../configuration.md#flows--task--flow-binding): it looks up the
task's type in `flows.byType`, falls back to `flows.defaultFlow`, and stamps the
result onto `Task.flowId`. Legacy tasks with no `flowId` read back as
`"default"` — zero behavior change. Once bound, the flow's status set and its
[handovers](./handover.md) describe how that task should travel from `ready` to
a terminal state.

## The concept pages

- **[Everything is a module](./modules.md)** — the module kinds, the three
  categories, locked modules, and why behavior is stored as data.
- **[From modules to agents](./agents.md)** — composition, bundle expansion, and
  the drift guard that keeps `*_ROLE.md` in sync with the JSON.
- **[Flows & the lifecycle](./flows.md)** — agents, edges, install, statuses,
  entry agents, and how `Task.flowId` binds.
- **[The handover system](./handover.md)** — module-level vs flow-edge
  handovers, the canonical lifecycle chain, and auto vs gated.

## See also

- [Built-in modules](../built-ins/default-modules.md),
  [built-in agents](../built-ins/default-agents.md), and the
  [default flow](../built-ins/default-flow.md) — the shipped inventory, item by
  item.
- [Default Flow](../flow/index.md) — the shipped lifecycle and its statuses in
  the dashboard.
- [Agents](../agents/index.md) — what each shipped agent does.
- [Configuration](../configuration.md) — the `flows` and `agents` config keys.
- [Guides](../guides/index.md) — task-driven walkthroughs.
