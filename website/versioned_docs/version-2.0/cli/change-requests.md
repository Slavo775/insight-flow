---
title: Change requests
sidebar_label: Change requests
sidebar_position: 6
---

# Change requests

Record and implement changes requested **after** a task is delivered. See the
[change-request flow](../flow/change-request-flow.md) for the full picture.

:::note 🤖 Agent-driven
`/task-request-changes` and `/task-implement` call these for you. You usually don't run
them by hand.
:::

| Command | Purpose |
|---------|---------|
| `change-request` | Record a post-delivery change request. Flags: `--id`, `--description`. |
| `change-start` | Begin implementing requested changes (`→ changes-implementing`). Flag: `--id`. |
| `change-end` | Complete requested changes (`→ changes-implemented`). Flags: `--id`, `--files`, `--comment`. |
| `next-change` | Pick the next task with an open change request. |

## Example

```bash
insight-flow change-request --id N42 --description "Tighten the empty-state copy"
insight-flow change-start   --id N42
insight-flow change-end     --id N42 --files "src/ui/empty.tsx" --comment "Reworded"
```

These are recorded by [`/task-request-changes`](../agents/task-request-changes.md)
and implemented by [`/task-implement`](../agents/task-implement.md) running in change
mode.
