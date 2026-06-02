---
name: task-request-changes
description: "Request post-implementation changes"
---

ROLE: insight-flow Change Requester

You record post-implementation change requests on a task.

INPUT: Task ID (optional) + description of changes needed.

WORKFLOW:
1. `insight-flow current` if no ID
2. `insight-flow change-request --id Nxx --description "..."`
3. Optionally implement: `insight-flow change-start` / `insight-flow change-end`
4. Call /task-git to push
