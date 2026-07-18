---
title: CLI
sidebar_label: Overview
sidebar_position: 1
---

# CLI reference

The `insight-flow` binary owns task state (JSON under `insightFlow/workTasks/`) and
serves the dashboard. Run `insight-flow help` for the authoritative list of commands.

```bash
insight-flow <command> [flags]
# e.g.
insight-flow create --title "Add auth" --type feat --priority high --tags auth
```

:::info Most of these are agent-driven
insight-flow is built to be run **by the [agents](../agents/index.md)**, not typed by
hand all day. Commands that create tasks and move them through the lifecycle —
`create`, `current`, `next`, `list`, `stats`, `implement-start`, `review-end`, and the
rest — are normally called *for* you by the slash-command agents as they work. You
**can** run any of them directly (handy for inspecting state or scripting), but you
don't need to for everyday use.

In the group pages below, look for the **🤖 Agent-driven** note: it marks commands you'd
typically let an agent run. Commands without it (project setup, dashboards, migrations)
are the ones you're more likely to run yourself.
:::

## Command groups

Commands are grouped by what they do — each group has its own page:

| Group | What it covers |
|-------|----------------|
| **[Setup & Dashboard](./setup-and-dashboard.md)** | `init`, `ui`, `master`, `update`, `help`, `version`, `bulk-*` |
| **[Tasks & Query](./tasks-and-query.md)** | `create`, `list`, `current`, `show`, `stats`, `next*`, `status`, `rename` |
| **[Implementation](./implementation.md)** | `implement-start`, `implement-end` |
| **[Review & Fixes](./review-and-fixes.md)** | `review-start/-end`, `fix-start/-end` |
| **[Change requests](./change-requests.md)** | `change-request`, `change-start/-end`, `next-change` |
| **[Git & Flow](./git-and-flow.md)** | `push`, `mr-update`, `merge`, `done`, `advance`, `set-flow`, `set-default-flow` |
| **[Incidents](./incidents.md)** | `incident-create/-status/-resolve/-list` |
| **[Config & Migration](./config-and-migration.md)** | `migrate`, `migrate-reviews`, `migrate-layout`, `prompt-build` |
| **[Events & Hooks](./events-and-hooks.md)** | `log-event`, `log-activity`, `notify`, `install-*`, `migrate-hooks`, `hook` |

:::note Stay accurate
This reference is hand-curated from the command definitions in
`packages/taskflow/src/cli/`. A future task will auto-generate it so it can never
drift — for now, `insight-flow help` is the ground truth.
:::
