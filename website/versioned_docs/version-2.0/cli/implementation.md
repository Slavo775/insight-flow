---
title: Implementation
sidebar_label: Implementation
sidebar_position: 4
---

# Implementation

The lifecycle commands that bracket implementing a task. Driven by the
[`/task-implement`](../agents/task-implement.md) agent, but usable directly.

:::note 🤖 Agent-driven
`/task-implement` calls these for you. You usually don't run them by hand.
:::

| Command | Purpose |
|---------|---------|
| `implement-start` | Mark implementation as started (`ready`/`in-progress` → `in-progress`). Flag: `--id`. |
| `implement-end` | Mark implementation complete (`→ implemented`) and record changed files. Flags: `--id`, `--files`. |

## Example

```bash
insight-flow implement-start --id N42
# ...do the work...
insight-flow implement-end --id N42 --files "src/auth.ts,src/routes.ts"
```

On `implement-end` the task moves to `implemented` and hands to
[`/task-git`](../agents/task-git.md). For post-approval changes, the equivalent
commands are `change-start` / `change-end` — see [Change requests](./change-requests.md).
