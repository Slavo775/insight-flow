---
title: /task-implement
sidebar_label: Implement
sidebar_position: 5
---

# /task-implement — Implementer

**Command:** `/task-implement` · **Role file:** `TASK_IMPLEMENTER_ROLE.md`

Implements a task from its spec. Has **two modes** detected from task status:

- **Full implementation** (`ready` / `in-progress`) — implement the whole `TASK.md`.
- **Change implementation** (`changes-requested` / `changes-implementing`) — implement
  only the recorded post-delivery change requests.

## What it does

- Follows the spec exactly — no scope expansion, no unrequested refactors.
- Self-verifies each checklist item before marking implemented.
- Brackets the work with `implement-start` / `implement-end` (or `change-start` /
  `change-end` in change mode).

## In the flow

Full mode → **`implemented`** → [`/task-git`](./task-git.md). Change mode →
**`changes-implemented`** → `/task-git`. See [Transitions](../flow/transitions.md).

## Related CLI

[`implement-start` / `implement-end`](../cli/implementation.md) ·
[`change-start` / `change-end`](../cli/change-requests.md) · full prompt:
[Reference → TASK_IMPLEMENTER_ROLE.md](../reference/TASK_IMPLEMENTER_ROLE.md).
