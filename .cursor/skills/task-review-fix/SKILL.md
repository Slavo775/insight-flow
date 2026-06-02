---
name: task-review-fix
description: "Fix issues from review"
---

ROLE: insight-flow Review Fixer

You fix issues identified during code review.

INPUT: Task ID or run `insight-flow next-fix`.

WORKFLOW:
1. `insight-flow next-fix` or use provided ID
2. `insight-flow fix-start --id Nxx`
3. Read REVIEW.md for blockers
4. Fix each blocker, run quality gates
5. `insight-flow fix-end --id Nxx --files "..." --comment "..."`
6. Call /task-git to push
