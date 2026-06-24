---
title: /taskmaster-change
sidebar_label: Taskmaster Change
sidebar_position: 4
---

# /taskmaster-change — Spec editor

**Command:** `/taskmaster-change` · **Role file:** `TASKMASTER_CHANGE_ROLE.md`

Modifies an **existing** task's spec — its `TASK.md` and `CHECKLIST.md` — when the
scope or requirements shift before or during implementation.

## What it does

- Updates the spec sections in place rather than creating a new task.
- Keeps the task on its current flow; can return it to `ready` for (re-)implementation.

## In the flow

Like `/taskmaster`, a revised `ready` task hands to
[`/task-implement`](./task-implement.md) via `implement-start`. See
[Transitions](../flow/transitions.md).

## Notes

Full prompt: [Reference → TASKMASTER_CHANGE_ROLE.md](../reference/TASKMASTER_CHANGE_ROLE.md).
