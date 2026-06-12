<!-- taskflow:start -->
## insight-flow

This project uses **insight-flow** for AI-assisted task lifecycle management.

## Task System

Tasks are tracked in `insightFlow/workTasks/` as sharded JSON files (legacy projects: `workTasks/`). Use the insight-flow CLI or slash commands to manage them.

## Commands

```bash
insight-flow create --title "..." --type feat|fix|rework --priority high|medium|low --tags a,b
insight-flow current                    # Show active task
insight-flow list                       # List all tasks
insight-flow stats                      # Aggregate statistics
insight-flow next                       # Pick next actionable task
insight-flow                            # Launch dashboard at http://localhost:6006
```

## Slash Commands (Claude Code Skills)

| Command | Purpose |
|---------|---------|
| `/task-analyze` | Pre-taskmaster strategist: challenge the brief, propose alternatives, then hand off to /taskmaster |
| `/taskmaster` | Create a new task spec (TASK.md + CHECKLIST.md) |
| `/task-implement` | Implement a task from its spec |
| `/task-review` | AI code review of implemented task |
| `/task-human-review` | Record human review feedback |
| `/task-review-fix` | Fix issues from review |
| `/task-git` | Branch, commit, push, PR, merge |
| `/task-incident` | Track production incidents |
| `/task-request-changes` | Request post-implementation changes |
| `/taskmaster-change` | Modify an existing task spec |

## Task Lifecycle

```
ready -> in-progress -> implemented -> reviewing -> approved -> pushed -> merged
                                          |
                                     fix-needed -> fixing -> fixed -> (re-review)
```

## Conventions

- Task IDs: N00, N01, N02, ...
- Task folders: `insightFlow/workTasks/Nxx-short-title/` containing TASK.md + CHECKLIST.md
- Branches: `<type>/Nxx-short-title` (e.g., `feat/N00-add-auth`)
- Commits: conventional commits (feat, fix, refactor, docs, chore, etc.)
- Tracker commands: `insight-flow <command>` (run `insight-flow help` for the full list)
<!-- taskflow:end -->
