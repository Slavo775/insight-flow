---
title: Dashboard
sidebar_label: Overview
sidebar_position: 1
description: The live insight-flow dashboard — what it is, how to launch it, and a tour of every view.
---

# The dashboard

The dashboard is insight-flow's **live, visual workbench**. It is a React +
Vite single-page app served by the CLI's HTTP server, and it renders the same
task store the [agents](../concepts/agents.md) and CLI read and write — a
Kanban board, per-task detail, the agent / module registry, your flow editor,
and a real-time activity feed of what Claude is doing right now.

Nothing on the dashboard is a separate database. Every panel reads the JSON
under your project's task store, so what you see is always what the CLI sees.

## Launching it

From any insight-flow project:

```bash
insight-flow ui
```

This starts the dashboard at **http://localhost:6006** and auto-starts the
[master hub](../built-ins/master-server.md) on port 6100 — the single-origin,
installable switcher that manages all your projects at once. Open the printed URL
in your browser.

:::tip Managing several projects?
Open the [master hub](../built-ins/master-server.md) at
`http://localhost:6100/overview`. It reverse-proxies each project's dashboard at
`/project/<id>/`, starts stopped projects, creates new ones from the browser, and
can be **installed as a PWA** (including on your phone). This single-project
dashboard is one project's view; the hub is the home base across projects.
:::

If you are working inside this repository's sandbox, the playground wires the
same thing up:

```bash
pnpm play          # → http://localhost:6006
```

:::info Live by default
The dashboard subscribes to a server-sent-events (SSE) stream, so it never
needs a manual refresh. Create a task from the CLI, run an agent, or edit a
flow in another tab, and the open dashboard updates itself.
:::

## A tour of the views

The dashboard is a handful of routes, all reachable from the top navigation:

| View                                                     | What it is for                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [Kanban board](./views.md#kanban-board)                  | The landing page — your tasks laid out in flow-status columns, with shard navigation and aggregate stats. (Notifications/sounds live in the [hub](../built-ins/master-server.md), not here.) |
| [Task detail](./views.md#task-detail)                    | Everything about one task: metadata, status history, reviews, incidents, and its position in the lifecycle flow.                            |
| [Agents browser](./views.md#agents-browser)              | Each agent's composed modules and the artifacts it installs.                                                                                |
| [Modules browser](./views.md#modules-browser)            | The full module registry and each module's composition map.                                                                                 |
| [Flow / project editor](./views.md#flow--project-editor) | Your named flows — their agents, flow graph, statuses, entry points, and install list.                                                      |
| [Activity feed](./views.md#activity-feed)                | Live Claude status and a timeline of events, streamed over SSE.                                                                             |

Head to the [views guide](./views.md) for a section on each, or read the
[concepts](../concepts/agents.md) behind the agent / module / flow views first.

:::tip New to insight-flow?
If you have not run a task yet, start with
[Getting started](../get-started/getting-started.md) — then come back and watch
the board light up.
:::
