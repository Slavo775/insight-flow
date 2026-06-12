# Work Tasks — Task Tracking System

Complete documentation for the insight-flow task tracking system. Read this file for full context on how tasks, incidents, agents, and the tracker CLI work together.

## File Structure

```
workTasks/
  master.json              # Meta: nextId, currentTaskId, nextIncidentId, shard list
  tasks-N00-N09.json       # Tasks N00-N09 (max 10 tasks per shard)
  tasks-N10-N19.json       # Tasks N10-N19 (created automatically)
  tasks-N20-N29.json       # ...and so on
  README.md                # This file
  N00-<slug>/              # Per-task folder with TASK.md, CHECKLIST.md, REVIEW.md
  N01-<slug>/
  ...
```

### master.json

```json
{
  "meta": {
    "nextId": 4,
    "currentTaskId": "N03",
    "nextIncidentId": 1,
    "shards": ["tasks-N00-N09.json"]
  }
}
```

- `nextId` — auto-incremented on task creation
- `currentTaskId` — tracks the active task (updated by `current`, `next`, etc.)
- `nextIncidentId` — global counter for unique INC-XXX numbering
- `shards` — list of shard files that exist

### Shard Files (tasks-NXX-NYY.json)

```json
{
  "range": { "from": 0, "to": 9 },
  "tasks": [
    {
      "id": "N00",
      "title": "...",
      "type": "fix|feat|rework",
      "priority": "critical|high|medium|low",
      "status": "ready|in-progress|implemented|...",
      "folder": "workTasks/N00-<slug>",
      "createdAt": "ISO8601",
      "statusHistory": [...],
      "implementation": { "startedAt", "completedAt", "filesChanged", "tokensUsed" },
      "reviews": [...],
      "changesAfterImplementation": [...],
      "incidents": [...],
      "pushes": [...],
      "branch": "fix/N00-<slug>",
      "mrUrl": "https://github.com/.../pull/XX",
      "mergedAt": null,
      "committedAt": null,
      "totalDurationMinutes": null,
      "tags": ["web", "api"]
    }
  ]
}
```

Each shard holds a maximum of 10 tasks. New shards are created automatically when a task's ID falls into a new range.

## Task Lifecycle

```
/taskmaster (create)
  |
  v
ready --> /task-implement --> in-progress --> implemented
                                                  |
                                                  v
                                    /task-git --> pushed
                                                  |
                                                  v
                                    /task-review --> reviewing
                                                      |
                                        +-------------+-------------+
                                        |                           |
                                        v                           v
                                    approved                   fix-needed
                                        |                           |
                                        v                           v
                                /task-git (merge)         /task-review-fix
                                        |                     fixing --> fixed
                                        v                           |
                                    merged                  (loop back to reviewing)
                                        |
                                        v (user tests, finds improvements)
                              /task-request-changes --> changes-requested
                                                              |
                                                              v
                                                  /task-implement
                                              changes-implementing --> changes-implemented
                                                              |
                                                              v
                                                        /task-git (push)
```

### Task Statuses

| Status                 | Meaning                                      |
| ---------------------- | -------------------------------------------- |
| `ready`                | Created, waiting for implementation          |
| `in-progress`          | Being implemented                            |
| `implemented`          | Implementation complete, not yet pushed      |
| `pushed`               | Code pushed to remote branch                 |
| `reviewing`            | Under review (AI or human)                   |
| `approved`             | Review passed                                |
| `fix-needed`           | Review found blockers                        |
| `fixing`               | Fix in progress                              |
| `fixed`                | Fix applied, ready for re-review             |
| `merged`               | Merged to main                               |
| `changes-requested`    | Post-implementation change requests recorded |
| `changes-implementing` | Change requests being implemented            |
| `changes-implemented`  | Change requests implemented, ready for push  |
| `done`                 | Fully complete                               |

## Incident Tracking

Production incidents are tracked **inside the task** they relate to, in the `incidents` array. They are NOT separate tasks.

### Change Request Schema

Change requests are stored in the `changesAfterImplementation` array on each task. These track post-implementation improvements (not bugs).

```json
{
  "requestedAt": "ISO8601",
  "description": "Summary of requested changes",
  "requestedBy": "task-request-changes",
  "status": "requested|implementing|implemented",
  "implementedAt": null,
  "filesChanged": [],
  "comment": null,
  "implementedBy": null
}
```

### Incident Schema

```json
{
  "id": "INC-001",
  "title": "API returns 500 on expense creation",
  "severity": "critical|high|medium|low",
  "status": "reported|investigating|production-fix|fixed|verified|closed",
  "reportedAt": "ISO8601",
  "resolvedAt": null,
  "branch": "fix/incident/N03-api-500-expense-creation",
  "description": "What happened in production",
  "rootCause": null,
  "fix": null,
  "statusHistory": [...]
}
```

### Incident Lifecycle

```
reported --> investigating --> production-fix --> fixed --> verified --> closed
```

| Status           | Meaning                                 |
| ---------------- | --------------------------------------- |
| `reported`       | Issue reported, not yet investigated    |
| `investigating`  | Actively looking at code/logs           |
| `production-fix` | Fix is being implemented                |
| `fixed`          | Fix pushed, awaiting human verification |
| `verified`       | Human confirmed fix works in production |
| `closed`         | Merged and done                         |

### Incident Branch Convention

`fix/incident/NXX-<short-description>` where NXX is the related task ID.

Example: `fix/incident/N03-api-500-expense-creation`

## Agent Roles & Workflow

### Normal Task Flow

```
/taskmaster  -->  /task-implement  -->  /task-review  -->  /task-git (merge)
     |                  |                    |                    |
     |                  |              fix-needed?         (user tests)
     |                  |                    |                    |
     |                  |            /task-review-fix    /task-request-changes
     |                  |                    |                    |
     |                  |              (loop review)     /task-implement
     |                  |                                        |
     |            /task-git (push)                        /task-git (push)
     |
  /task-git (branch + push task docs)
```

### Agent Descriptions

| Agent             | Command                 | Role File                      | Purpose                                                          |
| ----------------- | ----------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Taskmaster        | `/taskmaster`           | `TASKMASTER_ROLE.md`           | Creates tasks (TASK.md + CHECKLIST.md), assigns IDs              |
| Taskmaster Change | `/taskmaster-change`    | `TASKMASTER_CHANGE_ROLE.md`    | Modifies existing task spec + pushes                             |
| Implementer       | `/task-implement`       | `TASK_IMPLEMENTER_ROLE.md`     | Implements tasks per spec OR change requests (auto-detects mode) |
| Reviewer          | `/task-review`          | `TASK_REVIEWER_ROLE.md`        | AI code review against spec + checklist                          |
| Human Review      | `/task-human-review`    | `TASK_HUMAN_REVIEW_ROLE.md`    | Records human review feedback                                    |
| Fixer             | `/task-review-fix`      | `TASK_REVIEW_FIXER_ROLE.md`    | Fixes review blockers                                            |
| Git Agent         | `/task-git`             | `.claude/commands/task-git.md` | Branch, commit, push, merge                                      |
| Request Changes   | `/task-request-changes` | `TASK_REQUEST_CHANGES_ROLE.md` | Records post-testing change requests                             |
| Incident          | `/task-incident`        | `TASK_INCIDENT_ROLE.md`        | Handles production incidents                                     |

### Typical Session Flow

1. **Create task**: `/taskmaster fix: document upload has no feedback`
2. **Implement**: `/task-implement` (auto-picks next task)
3. **Push**: `/task-git` (commits + pushes)
4. **Review**: `/task-review` (AI review) or `/task-human-review` (record human feedback)
5. **Fix if needed**: `/task-review-fix` (auto-picks fix-needed tasks)
6. **Re-review**: repeat steps 4-5 until approved
7. **Merge**: `/task-git merge`
8. **Test & request changes** (optional): `/task-request-changes` (record improvements found during testing)
9. **Implement changes**: `/task-implement` (auto-detects `changes-requested` status, implements only changes)
10. **Push changes**: `/task-git` (commit + push)

### Production Incident Flow

1. **Report**: `/task-incident N03 API returns 500 on expense creation`
2. Agent creates incident, branch, investigates, fixes, pushes
3. Human verifies fix in production
4. Agent updates incident to verified/closed

## Branch Conventions

| Type         | Pattern                   | Example                              |
| ------------ | ------------------------- | ------------------------------------ |
| Feature task | `feat/NXX-<slug>`         | `feat/N03-expense-attachment-upload` |
| Fix task     | `fix/NXX-<slug>`          | `fix/N00-document-upload-feedback`   |
| Rework task  | `rework/NXX-<slug>`       | `rework/N05-refactor-auth`           |
| Incident fix | `fix/incident/NXX-<slug>` | `fix/incident/N03-api-500-expense`   |

## CLI Reference

All commands: `insight-flow <command> [options]`

### Task Commands

```bash
# Create a new task
create --title "..." --type fix|feat|rework --priority high|medium|low --tags web,api

# Update task status manually
status --id N00 --status <status> [--by agent-name]

# Implementation lifecycle
implement-start --id N00
implement-end --id N00 --files "file1.ts,file2.ts"

# Review lifecycle
review-start --id N00 [--type ai|human] [--by task-review]
review-end --id N00 --verdict approved|fix-needed [--type ai|human] [--comment "..."]

# Fix lifecycle
fix-start --id N00
fix-end --id N00 --files "file1.ts" [--comment "Fixed X"]

# Git operations
push --id N00 --commit abc123 --message "feat: ..." [--branch feat/N00-slug]
mr-update --id N00 --url "https://github.com/.../pull/1"
merge --id N00
done --id N00

# Queries
current                    # Show active task
next                       # Pick next implementable task
next-review                # Pick next task needing review
next-fix                   # Pick next task needing fixes
next-change                # Pick next task with pending change requests
list [--status ready]      # List tasks, optionally filtered
stats                      # Aggregate stats across all shards
```

### Change Request Commands

```bash
# Record a change request on a task
change-request --id N00 --description "..." [--by task-request-changes]

# Start implementing change requests
change-start --id N00 [--by implement-changes]

# Complete change implementation
change-end --id N00 --files "file1.ts,file2.ts" [--comment "..."] [--by implement-changes]

# Find next task with pending change requests
next-change
```

### Incident Commands

```bash
# Create incident on a task
incident-create --id N03 --title "..." --severity critical|high|medium|low [--description "..."]

# Update incident status
incident-status --id N03 --incident INC-001 --status investigating|production-fix|fixed|verified|closed

# Resolve incident with root cause
incident-resolve --id N03 --incident INC-001 --rootCause "..." --fix "..."

# List incidents
incident-list [--id N03]   # For one task or all tasks
```

## Per-Task Folder Contents

Each task gets a folder: `workTasks/NXX-<slug>/`

| File           | Created By     | Purpose                                       |
| -------------- | -------------- | --------------------------------------------- |
| `TASK.md`      | `/taskmaster`  | Problem, goal, scope, implementation plan     |
| `CHECKLIST.md` | `/taskmaster`  | Done criteria, quality gates, verification    |
| `REVIEW.md`    | `/task-review` | Review findings, verdicts, human review notes |
