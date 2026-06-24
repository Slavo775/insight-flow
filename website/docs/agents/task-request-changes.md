---
title: /task-request-changes
sidebar_label: Request Changes
sidebar_position: 11
---

# /task-request-changes — Change recorder

**Command:** `/task-request-changes` · **Role file:** `TASK_REQUEST_CHANGES_ROLE.md`

Records human change requests **after** a task is delivered — enhancements, UX
tweaks, refinements — without reopening review or filing a new task.

## What it does

- Captures the human's request (preserving exact wording) on the existing task.
- Moves the task into the change-request side-flow (`changes-requested`).

## In the flow

Hands to [`/task-implement`](./task-implement.md) in change mode via `change-request`.
See [Change-request flow](../flow/change-request-flow.md).

## Related CLI

[`change-request`, `change-start`, `change-end`, `next-change`](../cli/change-requests.md)
· full prompt: [Reference → TASK_REQUEST_CHANGES_ROLE.md](../reference/TASK_REQUEST_CHANGES_ROLE.md).
