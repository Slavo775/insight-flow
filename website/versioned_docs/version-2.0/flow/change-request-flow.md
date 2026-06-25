---
title: Change-request flow
sidebar_label: Change-request flow
sidebar_position: 4
---

# Change-request flow

Sometimes a task is delivered and approved, then a human wants **further changes** —
an enhancement, a UX tweak, a refinement. Rather than reopening review or filing a
brand-new task, insight-flow tracks these as a change-request side-flow on the
existing task.

## The path

```
done ─request-changes─▶ changes-requested ─▶ changes-implementing ─▶ changes-implemented ─▶ git
```

| Status | Set by | Meaning |
|--------|--------|---------|
| `request-changes` | `/task-request-changes` | A change request is being recorded. |
| `changes-requested` | `/task-request-changes` | Change(s) recorded; awaiting work. |
| `changes-implementing` | `/task-implement` (change mode) | Implementing the requested changes. |
| `changes-implemented` | `/task-implement` (change mode) | Done; hands back to `/task-git`. |

## Agents involved

- **[`/task-request-changes`](../agents/task-request-changes.md)** records the human's
  request (preserving their exact wording) and moves the task into
  `changes-requested`.
- **[`/task-implement`](../agents/task-implement.md)** runs in **change mode**: it
  implements only the recorded change requests, then sets `changes-implemented`.
- **[`/task-git`](../agents/task-git.md)** takes it from there to push/PR.

## CLI commands

```bash
insight-flow change-request --id Nxx --description "..."
insight-flow change-start   --id Nxx
insight-flow change-end     --id Nxx --files "a.ts,b.ts" --comment "..."
insight-flow next-change                      # pick the next change request
```

See the [CLI: Change requests](../cli/change-requests.md) group for full flags.
