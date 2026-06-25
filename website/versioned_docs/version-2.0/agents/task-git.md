---
title: /task-git
sidebar_label: Git
sidebar_position: 9
---

# /task-git — Git operator

**Command:** `/task-git` · **Role file:** `TASK_GIT_ROLE.md`

Handles all git operations for a task: branch, commit, push, open the PR/MR, and
merge. PR commands are technology-agnostic — you supply the host CLI via
`agents.extend` (examples in `PR_API.md`).

## What it does

- Creates the task branch (`<type>/Nxx-short-title`) and commits with conventional
  messages.
- Pushes and records the PR/MR URL on the task.
- Merges and updates the tracker.

## In the flow

After implementation/approval, `push` sets **`pushed`** and hands to
[`/task-review`](./task-review.md); later `merge` + `done` close the task. See
[Transitions](../flow/transitions.md).

## Related CLI

[`push`, `mr-update`, `merge`, `done`, `advance`](../cli/git-and-flow.md) · full prompt:
[Reference → TASK_GIT_ROLE.md](../reference/TASK_GIT_ROLE.md).
