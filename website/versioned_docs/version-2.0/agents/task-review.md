---
title: /task-review
sidebar_label: Review
sidebar_position: 6
---

# /task-review — AI reviewer

**Command:** `/task-review` · **Role file:** `TASK_REVIEWER_ROLE.md`

Performs an AI code review of an implemented task against its spec, verifying each
checklist item and flagging blockers.

## What it does

- Reviews the change on the project's review surface (host-specific; see `PR_API.md`).
- Records findings in `REVIEW.md` and the tracker via `review-end`.
- Issues a verdict: `approved` or `fix-needed`.

## In the flow

- `approved` → [`/task-human-review`](./task-human-review.md).
- `fix-needed` → [`/task-review-fix`](./task-review-fix.md).

See [Transitions](../flow/transitions.md).

## Related CLI

[`review-start` / `review-end`](../cli/review-and-fixes.md) · full prompt:
[Reference → TASK_REVIEWER_ROLE.md](../reference/TASK_REVIEWER_ROLE.md).
