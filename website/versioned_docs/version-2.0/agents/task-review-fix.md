---
title: /task-review-fix
sidebar_label: Review Fix
sidebar_position: 8
---

# /task-review-fix — Review fixer

**Command:** `/task-review-fix` · **Role file:** `TASK_REVIEW_FIXER_ROLE.md`

Fixes the blockers raised during review. Fetches review comments (from the project's
review surface, or `REVIEW.md` as fallback), applies targeted fixes, and replies.

## What it does

- Reads only the files referenced by blockers; applies minimal, targeted fixes.
- Fixes **only** what was flagged as a blocker — non-blocking suggestions are noted,
  not acted on (unless trivial and authorized).
- Brackets work with `fix-start` / `fix-end` and re-runs quality gates.

## In the flow

`fixed` → back to [`/task-review`](./task-review.md) for re-review. See
[Transitions](../flow/transitions.md).

## Related CLI

[`fix-start` / `fix-end`](../cli/review-and-fixes.md) · full prompt:
[Reference → TASK_REVIEW_FIXER_ROLE.md](../reference/TASK_REVIEW_FIXER_ROLE.md).
