---
title: Getting Started
sidebar_label: Getting Started
sidebar_position: 2
slug: /getting-started
---

# Getting Started

This page takes you from zero to a running dashboard with your first task.

:::tip insight-flow is agent-driven
In normal use you **don't run the task commands by hand**. The [agents](../agents/index.md)
— Claude Code slash commands like `/task-analyze`, `/taskmaster`, `/task-implement` —
create tasks and drive the whole lifecycle *with* you. The CLI commands shown below are
what the agents call under the hood; you're welcome to run them directly, but you rarely
need to. Think of insight-flow as the engine the agents drive, plus a dashboard for you
to watch.
:::

## No terminal? Start from the home base

If you'd rather not use a terminal, install insight-flow globally and just run it
with **no project** — it opens the **home base** (the overview at
`http://localhost:6100/overview`):

```bash
npm install -g insight-flow
insight-flow           # opens the home base — no project needed
```

From there, click **“+ New project”**, give it a name, and insight-flow scaffolds
a project for you under `~/insight-flow-projects/<name>` (override with
`INSIGHT_FLOW_PROJECTS_HOME`). Open that folder and run `insight-flow` there to
launch its dashboard. The rest of this page uses the terminal directly.

## 1. Initialize in your project

```bash
npx insight-flow init
```

`init` scaffolds the agent role files, slash commands, and a `taskflow.config.json`
with **zero technology assumptions** — no package manager, language toolchain, or
git host is baked in. You add your own stack-specific commands via the
[`agents.extend`](../agents/index.md#extending-agents) mechanism.

Optionally install the CLI globally so `insight-flow` is on your PATH everywhere:

```bash
npm install -g insight-flow
```

## 2. Create your first task

There are two ways to create a task — **the agent way (normal)** and the manual CLI way.

### The agent way (recommended)

In Claude Code, just describe what you want and let the agents do it. Typically you
start with the strategist, which challenges the brief and then hands off to the
taskmaster to write the spec:

```
/task-analyze   # discuss the idea; it proposes options
/taskmaster     # writes the task spec (TASK.md + CHECKLIST.md)
```

You don't type any `create` command — `/taskmaster` calls the CLI for you and the new
task appears on the dashboard. This is how you'll create tasks day to day.

### The manual way (optional)

If you want to create a task directly, the CLI is always there:

```bash
insight-flow create \
  --title "Add user auth" \
  --type feat \
  --priority high \
  --tags auth,api
```

Either way, each task gets a unique `Nxx` ID and a folder under
`insightFlow/workTasks/` containing a `TASK.md` spec and a `CHECKLIST.md`, and starts
in the `ready` state of the [default flow](../flow/index.md).

## 3. See what to work on

```bash
insight-flow current    # the active task
insight-flow next       # the next actionable task, by priority
insight-flow list       # everything
insight-flow stats      # aggregate statistics
```

These are mostly **how the agents decide what to do next** — `/task-implement` runs
`next`, `/task-review` runs `next-review`, and so on. Run them yourself any time you want
to peek at state, but you don't have to; the dashboard shows the same thing visually.

## 4. Launch the dashboard

```bash
insight-flow            # dashboard at http://localhost:6006
# or
insight-flow ui         # dashboard + multi-project master overview (port 6100)
```

The dashboard is a live Kanban board, timeline, and per-task detail panel that
updates as the CLI (or the agents) change task state.

## 5. Run the lifecycle with agents

In Claude Code, the work is driven by [agents](../agents/index.md) — slash commands
that move a task through the [flow](../flow/index.md):

```
/task-analyze   → challenge the brief, propose options
/taskmaster     → write the task spec
/task-implement → implement it
/task-review    → AI review
/task-git       → branch, push, PR, merge
```

Prefer to drive it yourself? Every transition also has a plain CLI command — see
the [CLI reference](../cli/index.md).

## Next steps

- Understand the [Default Flow](../flow/index.md) your tasks move through.
- Meet the [Agents](../agents/index.md) and the module model behind them.
- Browse the full [CLI](../cli/index.md), grouped by purpose.
