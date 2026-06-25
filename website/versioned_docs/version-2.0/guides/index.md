---
title: Guides
sidebar_label: Overview
sidebar_position: 1
---

# Guides

Problem-oriented, task-focused recipes for getting specific things done with
insight-flow. These assume you've already been through
[Getting Started](../get-started/getting-started.md) and want to solve a concrete
problem.

:::note Building out
This section is being filled in. The recipes below are planned; each will be a
short, copy-pasteable walkthrough.
:::

## Planned recipes

- **Wire up PR creation for your git host** — configure `agents.extend.task-git`
  so `/task-git` opens PRs/MRs via `gh` / `glab` (or a prefill URL).
- **Add your stack's quality gates** — make `/task-implement` and
  `/task-review-fix` run your typecheck / lint / test before marking work done,
  via `agents.extend`.
- **Create a custom flow** — define your own lifecycle (states, agents, edges)
  and bind task types to it with `flows.byType`.
- **Install & uninstall modules** — use the install engine to add MCP servers,
  hooks, and skills to a project, and roll them back.
- **Run the multi-project master** — track several insight-flow projects from one
  overview server.
- **Upgrade from 1.x to 2.0** — migrate the layout and composition model.

## In the meantime

- [Configuration](../configuration.md) documents every `taskflow.config.json` key,
  including `agents.extend` and `flows`.
- The [CLI reference](../cli/index.md) covers each command's flags.
- [Agents](../agents/index.md) describes each slash command's role.
