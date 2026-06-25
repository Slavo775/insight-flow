---
title: /taskmaster
sidebar_label: Taskmaster
sidebar_position: 3
---

# /taskmaster — Work item generator

**Command:** `/taskmaster` · **Role file:** `TASKMASTER_ROLE.md`

Generates well-structured work items (bug, feature, or rework). Each task gets a
unique `Nxx` ID and a folder with a scaffolded `TASK.md` and `CHECKLIST.md`.

## What it does

- Runs `insight-flow create` to assign the ID + scaffold files.
- Fills the spec sections: Problem · Goal · Scope (In/Out) · Implementation plan ·
  Verification · Notes, plus binary checklist items.
- Hands to `/task-git` (PR-before-implementation) or `/task-implement`.

## In the flow

Creates the task in **`ready`**, which hands to
[`/task-implement`](./task-implement.md) via `implement-start`.

## Related CLI

[`create`](../cli/tasks-and-query.md) · full prompt:
[Reference → TASKMASTER_ROLE.md](../reference/TASKMASTER_ROLE.md).
