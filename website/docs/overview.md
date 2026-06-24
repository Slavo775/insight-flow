---
title: Overview
sidebar_label: Overview
sidebar_position: 1
---

# What is insight-flow?

**insight-flow** is a workbench for **AI-assisted task lifecycle management** — a
single CLI that owns your task state and serves a live dashboard. It gives any
project a structured, auditable, and *visual* way to take work from an idea all
the way to a merged change.

It was designed for [Claude Code](https://claude.com/claude-code) workflows, but
it is not only for developers and it works standalone. If you want to **design a
flow of AI agents** and **track the progress of the tasks** they work on, that is
exactly what insight-flow does.

## The core idea

Most "AI does the work" setups are a black box: you ask, something happens, and
you hope it was right. insight-flow turns that into an explicit, inspectable
process:

- **Flows** describe the lifecycle a task moves through, and which agent acts at
  each step.
- **Agents** are role-driven actors (each a slash command) that move a task
  forward — analyze, implement, review, fix, git, and more.
- **Tasks** are the unit of work. Each has a spec, a checklist, a review history,
  and an incident log — all stored as auditable JSON.
- The **dashboard** visualizes everything live: a Kanban board, a timeline, and a
  per-task detail panel.

```
        ┌── design a flow ──┐      ┌──── run agents along it ────┐
idea →  │  states + agents  │  →   │ analyze → implement → review │ → merged
        └───────────────────┘      └──────────────────────────────┘
                         everything tracked as JSON + shown live
```

:::info Who runs what
insight-flow is **agent-driven**. In day-to-day use the [agents](./agents/index.md)
create tasks and run the lifecycle *with* you — you don't manually type
`create`/`next`/`implement-start`/etc. The CLI exists so the agents (and you, when you
want) can drive task state; the dashboard is for watching it happen. So "you" in this
documentation often means "you, via an agent."
:::

## Who it's for

- **Builders using AI agents** who want a repeatable pipeline instead of ad-hoc
  prompting.
- **Teams** who need an audit trail: what was specified, what was reviewed, what
  changed after approval, and what broke in production.
- **Anyone orchestrating multi-step work** — the flow and agent model isn't tied
  to writing code; it's a general "states + actors + tracking" engine.

## What you get

| Piece | What it does |
|-------|--------------|
| **CLI** (`insight-flow`) | One binary: owns task state, runs the lifecycle, serves the dashboard. See [CLI](./cli/index.md). |
| **Default flow** | A ready-to-use lifecycle (`ready → … → merged`) with agents bound to each transition. See [Default Flow](./flow/index.md). |
| **Agents** | 10 composable, role-driven slash commands. See [Agents](./agents/index.md). |
| **Dashboard** | Live Kanban / timeline / detail view, plus a multi-project master overview. |
| **Module model** | "Everything is a module" — agents are composed from modules and customizable in user-space without forking. |

## Where to next

- **[Getting Started](./getting-started.md)** — install, create your first task,
  launch the dashboard.
- **[Default Flow](./flow/index.md)** — the lifecycle and its transitions.
- **[Agents](./agents/index.md)** — the actors and how they're composed.
- **[CLI](./cli/index.md)** — every command, grouped by what it does.
