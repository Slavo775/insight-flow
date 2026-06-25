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

## Recipes

**Extend the agents for your stack**

- [Wire up PR creation for your git host](./wire-pr-creation.md) — configure
  `agents.extend.task-git` so `/task-git` opens PRs/MRs via `gh` / `glab` (or a
  prefill URL).
- [Add your stack's quality gates](./quality-gates.md) — make `/task-implement`
  and `/task-review-fix` run your typecheck / lint / test before marking work
  done, via `agents.extend`.

**Customize the composition model**

- [Author a custom module](./custom-module.md) — write a `custom:<slug>` module
  (section / include / mcp-server / hook / skill / bundle) in user space.
- [Compose a custom agent](./custom-agent.md) — build an agent from module ids
  and generate its role file with `prompt-build --compose`.
- [Define a custom flow](./custom-flow.md) — declare a lifecycle (agents, edges,
  statuses, entry agents) and bind task types to it.
- [Install & uninstall modules](./install-engine.md) — run a target's install
  plan, fill `${VAR}` inputs, and roll changes back via the manifest.

**Operate insight-flow**

- [Run the multi-project master](./multi-project-master.md) — track several
  insight-flow projects from one overview server on port 6100.
- [Upgrade from 1.x to 2.0](./upgrade-1x-to-2.md) — migrate the layout and the
  composition model.

**Troubleshooting & operations**

- [Troubleshooting & FAQ](./troubleshooting.md) — problem → fix entries: ports,
  stale dashboards, the old `workTasks/` layout, skipped agent steps, suppressing
  the browser, and recovering a stuck master.
- [Using insight-flow with Cursor](./cursor.md) — scaffold the Cursor skills,
  hooks, and `AGENTS.md`, read the `cursor` provider badge, and understand the
  cloud-agent / approval-gate caveats.
- [Set up observability (Langfuse)](./observability.md) — opt into Langfuse
  tracing, resolve credentials config-first then env, and see what gets traced.

## In the meantime

- [Configuration](../configuration.md) documents every `taskflow.config.json` key,
  including `agents.extend` and `flows`.
- The [CLI reference](../cli/index.md) covers each command's flags.
- [Agents](../agents/index.md) describes each slash command's role.
