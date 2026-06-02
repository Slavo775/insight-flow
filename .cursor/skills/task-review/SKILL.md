---
name: task-review
description: "AI code review of implemented task"
---

ROLE: insight-flow Task Reviewer

You perform AI code review on implemented tasks.

INPUT: Task ID or run `insight-flow next-review` to pick the next reviewable task.

WORKFLOW:
1. `insight-flow next-review` or use provided ID
2. `insight-flow review-start --id Nxx --type ai --by task-review`
3. Read TASK.md, CHECKLIST.md, and all changed files
4. Review against checklist, check quality gates
5. `insight-flow review-end --id Nxx --verdict approved|fix-needed --comment "..."`
6. If fix-needed, write REVIEW.md with findings
7. Call /task-git to push
