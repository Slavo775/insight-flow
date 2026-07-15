---
title: Views
sidebar_label: Views
sidebar_position: 2
description: A tour of every dashboard view — the Kanban board, task detail, the agent and module browsers, the flow editor, and the live activity feed.
---

# Dashboard views

The dashboard is a small set of routes served from
**http://localhost:6006**. This page walks through each one — what it shows and
what you use it for. For the model behind the agent / module / flow views, see
[Concepts](../concepts/agents.md).

---

## Kanban board

The board is the landing page (`/`). It lays your tasks out in columns, one
column per status in the bound flow.

:::note 📸 Screenshot pending
_Screenshot to add: the Kanban board showing tasks in flow-status columns._
(save as `static/img/dashboard/kanban.png`, then embed here)
:::

- **Shard navigation** — tasks are stored in shards of ten. When a project has
  more than one shard, a shard switcher appears above the board so you can page
  through them.
- **Aggregate stats** — a strip of summary counts (totals and per-status
  tallies) sits above the columns.
- **Flow-status columns** — the columns are derived from the statuses of the
  bound [flow](../concepts/flows.md), so a custom flow with custom states shows
  its own columns. Click any card to open its detail panel.

Notification and sound settings are not on the project dashboard — they live in
the [hub](../built-ins/master-server.md), which is the single notifier. Open
your projects through the hub to get notified.

When the activity engine is enabled, the board also carries the **Agent
Activity** and **Recent Activity** tabs (see [Activity feed](#activity-feed)
below). If the engine is off, a chip explains how to enable it in
[`taskflow.config.json`](../configuration.md).

---

## Task detail

Open any card, or visit `/task/<id>`, for the full record of one task.

:::note 📸 Screenshot pending
_Screenshot to add: the task detail page with metadata, status history, reviews, and the lifecycle map._
(save as `static/img/dashboard/task-detail.png`, then embed here)
:::

The page gathers everything about the task in one place:

- **Metadata** — title, type, priority, tags, and the assigned flow.
- **Status history** — the trail of status transitions the task has moved
  through.
- **Reviews** — the recorded AI and human reviews, with their verdicts.
- **Incidents** — any production incidents logged against the task.
- **Implementation details** — the implementation notes and artifacts captured
  as the task progressed.
- **Lifecycle position** — a map of where the task sits in its flow, with
  suggested next agents (each chip copies the agent's slash command). While the
  task is still `ready` you can reassign it to a different flow; once work
  starts, the flow locks.

---

## Agents browser

The agents browser (`/agent`, or `/agent/<id>`) lists every composed
[agent](../concepts/agents.md) in the sidebar with its title and description.

:::note 📸 Screenshot pending
_Screenshot to add: an agent detail page with its composition map of modules._
(save as `static/img/dashboard/agents.png`, then embed here)
:::

Selecting an agent shows its **composition map** — the ordered sequence of
[modules](../concepts/modules.md) (sections, includes, MCP servers, hooks,
skills, bundles, and behavior nodes) that compose into the agent's prompt.
Clicking a module node opens an info modal in place. The header shows which
slash command the agent installs as, and **Install** / **Uninstall** buttons
apply the agent's prompt and its modules' artifacts to your project. See the
[shipped agents](../built-ins/default-agents.md) for the defaults you start
with.

---

## Modules browser

The modules browser (`/module`, or `/module/<id>`) is the full
[module](../concepts/modules.md) registry, grouped in the sidebar by **custom**,
**shared**, integrations, and per-agent modules.

:::note 📸 Screenshot pending
_Screenshot to add: a module detail page showing its kind-specific panel and composition map._
(save as `static/img/dashboard/modules.png`, then embed here)
:::

Each module's detail page shows its kind badge, source, and description, plus
kind-specific panels — section body, include reference and preview, MCP config
JSON, hook event/matcher/command, skill content, bundle contents, or a
behavior node's fields. A **referenced by** panel lists the agents that compose
the module, and a composition map ties it all together. Installable kinds
(MCP server, hook, skill, bundle) offer **Install** / **Uninstall** actions.
The [shipped modules](../built-ins/default-modules.md) page documents the
defaults.

---

## Flow / project editor

The flow editor (`/project`, or `/project/<id>`) is the top layer: each named
[flow](../concepts/flows.md), with its agents, lifecycle graph, statuses, entry
points, and install list.

:::note 📸 Screenshot pending
_Screenshot to add: the flow editor with the lifecycle graph and the sidebar of agents and installed modules._
(save as `static/img/dashboard/project.png`, then embed here)
:::

- **Flows** — every flow is listed in the sidebar (the shipped default is
  badged). Custom flows can be deleted, set as the binding default, or
  duplicated as a starting point for a new one.
- **Agents** — the flow's agent set, with its **entry agents** (start points)
  marked ★.
- **Flow graph** — a map of the lifecycle: nodes are agents, edges are the
  handovers between statuses. In **edit flow** mode you can drag nodes, wire
  edges (picking the trigger status for each), and manage **custom states**
  that alias onto the canonical task statuses.
- **Install list** — the modules installed in this flow, with **Install this
  flow** / **Uninstall** to apply or remove the flow's MCP servers, hooks, and
  skills.

New flows are created from `/project/new`. The shipped default ejects to a
custom copy the first time you save edits to it, and can be reverted to the
shipped version.

---

## Activity feed

When the activity engine is enabled, the board surfaces a live feed of what
Claude is doing.

:::note 📸 Screenshot pending
_Screenshot to add: the activity feed showing the live Claude status and an event timeline._
(save as `static/img/dashboard/activity.png`, then embed here)
:::

- **Live Claude status** — a status chip reflects whether the agent is
  **active**, **idle**, **awaiting permission**, or **done**. The same signal
  drives the page-title glyph on the project dashboard; sound and desktop
  notifications fire from the [hub](../built-ins/master-server.md), not here.
- **Event timeline** — a stream of activity events (tool use, status changes)
  rendered as they arrive, filtered by the configured verbosity.

Everything here arrives over the same **server-sent-events** stream the rest of
the dashboard uses, so the feed is live without a refresh. Enabling the engine
is a one-line change in [`taskflow.config.json`](../configuration.md); when it
is off, the dashboard falls back to a static recent-activity timeline.
