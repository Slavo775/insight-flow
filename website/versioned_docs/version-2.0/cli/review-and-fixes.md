---
title: Review & Fixes
sidebar_label: Review & Fixes
sidebar_position: 5
---

# Review & Fixes

Run reviews and apply blocker fixes. Used by the
[`/task-review`](../agents/task-review.md),
[`/task-human-review`](../agents/task-human-review.md), and
[`/task-review-fix`](../agents/task-review-fix.md) agents.

:::note 🤖 Agent-driven
The review and fix agents call these for you. You usually don't run them by hand —
though `/task-human-review` is exactly where *your* feedback enters the loop.
:::

## Review

| Command | Purpose |
|---------|---------|
| `review-start` | Begin a review. Flags: `--id`, `--type ai\|human`, `--by`. |
| `review-end` | Finish a review with a verdict. Flags: `--id`, `--verdict approved\|fix-needed`, `--type`, `--comment`. |

## Fixes

| Command | Purpose |
|---------|---------|
| `fix-start` | Begin fixing review blockers (`→ fixing`). Flag: `--id`. |
| `fix-end` | Complete fixes (`→ fixed`) and record changed files. Flags: `--id`, `--files`, `--comment`. |

## Example

```bash
insight-flow review-start --id N42 --type ai --by task-review
insight-flow review-end   --id N42 --type ai --verdict fix-needed --comment "2 blockers"

insight-flow fix-start --id N42
insight-flow fix-end   --id N42 --files "src/auth.ts" --comment "Fixed blockers 1-2"
```

A `fix-needed` verdict routes the task to `/task-review-fix`; `fix-end` sends it back
to review. An `approved` verdict (AI) hands to human review; an `approved` human
review hands to `/task-git`. See [Transitions & agents](../flow/transitions.md).
