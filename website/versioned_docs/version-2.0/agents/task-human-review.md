---
title: /task-human-review
sidebar_label: Human Review
sidebar_position: 7
---

# /task-human-review — Human review recorder

**Command:** `/task-human-review` · **Role file:** `TASK_HUMAN_REVIEW_ROLE.md`

Records the **human's** review feedback on a task — verbatim — then updates
`REVIEW.md` and the tracker so downstream agents can act.

## What it does

- Appends a `## Human Review` section to `REVIEW.md` (blockers / suggestions / notes),
  preserving the human's exact wording.
- Records the verdict via `review-end`: blockers → `fix-needed`; LGTM → `approved`;
  post-delivery changes → `done`.
- Never invents feedback or decides on the human's behalf.

## In the flow

- `approved` → [`/task-git`](./task-git.md).
- `fix-needed` → [`/task-review-fix`](./task-review-fix.md).
- `done` → [`/task-request-changes`](./task-request-changes.md).

See [Transitions](../flow/transitions.md).

## Related CLI

[`review-start` / `review-end`](../cli/review-and-fixes.md) · full prompt:
[Reference → TASK_HUMAN_REVIEW_ROLE.md](../reference/TASK_HUMAN_REVIEW_ROLE.md).
