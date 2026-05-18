# taskflow

A workbench for AI-assisted task lifecycle management — CLI plus a built-in live dashboard.

`taskflow` gives any project structured, auditable, visualizable task execution. One command to init, one command to launch the dashboard. Designed for Claude Code workflows but works standalone.

## Quick Start

```bash
# Initialize in your project
npx taskflow init

# Create your first task
taskflow create --title "Add user auth" --type feat --priority high --tags auth,api

# Launch the dashboard
taskflow
```

The dashboard opens at `http://localhost:6006` with live-reload — create tasks in one terminal, see them appear instantly in the browser.

## Install

```bash
# Global
npm install -g taskflow

# Project dev dependency
npm install -D taskflow

# Or just use npx
npx taskflow init
```

## What You Get

After `taskflow init`, your project has:

```
your-project/
├── taskflow.config.json        # Configuration
├── workTasks/
│   ├── master.json             # Meta + shard index
│   ├── tasks-N00-N09.json      # Task shard (tasks 0-9)
│   └── N00-my-task/            # Task folder (TASK.md, CHECKLIST.md)
└── .claude/
    └── roles/                  # Agent role templates (for Claude Code)
```

## Dashboard

```bash
taskflow              # Launch dashboard (default)
taskflow ui           # Same thing
taskflow ui --port 8080  # Custom port
```

The built-in dev server:
- Serves task JSON as a REST API (`/api/work-tasks`, `/api/work-tasks/:file`)
- Renders a Kanban board, stats, timeline, and task detail panels
- Watches `workTasks/` for changes and live-reloads via SSE
- Auto-opens the browser

## CLI Reference

### Task Lifecycle

```bash
# Create
taskflow create --title "..." --type feat|fix|rework --priority critical|high|medium|low --tags a,b

# Status transitions
taskflow status --id N00 --status ready|in-progress|implemented|... [--by agent-name]

# Implementation tracking
taskflow implement-start --id N00
taskflow implement-end --id N00 --files "src/a.ts,src/b.ts"

# Code review
taskflow review-start --id N00 [--type ai|human] [--by reviewer]
taskflow review-end --id N00 --verdict approved|fix-needed [--comment "..."]

# Fix cycle
taskflow fix-start --id N00
taskflow fix-end --id N00 --files "src/a.ts" [--comment "..."]

# Git integration
taskflow push --id N00 --commit abc123 --message "feat: ..." [--branch name]
taskflow mr-update --id N00 --url "https://github.com/.../pull/1"
taskflow merge --id N00
taskflow done --id N00
```

### Change Requests (post-implementation)

```bash
taskflow change-request --id N00 --description "Fix the button color"
taskflow change-start --id N00
taskflow change-end --id N00 --files "src/button.tsx" [--comment "..."]
taskflow next-change
```

### Incidents

```bash
taskflow incident-create --id N00 --title "API 500 on login" --severity critical
taskflow incident-status --id N00 --incident INC-001 --status investigating
taskflow incident-resolve --id N00 --incident INC-001 --rootCause "..." --fix "..."
taskflow incident-list [--id N00]
```

### Queries

```bash
taskflow current          # Show active task
taskflow list             # List all tasks
taskflow list --status ready  # Filter by status
taskflow stats            # Aggregate statistics
taskflow next             # Pick next actionable task (smart priority)
taskflow next-review      # Pick next task awaiting review
taskflow next-fix         # Pick next task needing fixes
```

### Other

```bash
taskflow init             # Initialize taskflow in current project
taskflow migrate          # Migrate from legacy tracker.json format
taskflow help             # Show help
taskflow version          # Show version
```

## Configuration

`taskflow.config.json` in your project root:

```json
{
  "workDir": "workTasks",
  "shardSize": 10,
  "projectName": "my-project",
  "rolesDir": ".claude/roles",
  "server": {
    "port": 6006
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `workDir` | `workTasks` | Directory for task data files |
| `shardSize` | `10` | Tasks per shard file (N00-N09, N10-N19, etc.) |
| `projectName` | from `package.json` or dir name | Used in role templates |
| `rolesDir` | `.claude/roles` | Where role templates are copied on init |
| `server.port` | `6006` | Dashboard dev server port |

## Data Model

Tasks are stored as sharded JSON files for performance:

- **`master.json`** — meta (next ID, current task, shard index)
- **`tasks-N00-N09.json`** — shard containing tasks 0-9
- **`tasks-N10-N19.json`** — shard containing tasks 10-19
- etc.

Each task tracks its full lifecycle:

```
ready → in-progress → implemented → reviewing → approved → pushed → merged
                                        ↓
                                   fix-needed → fixing → fixed → (re-review)
```

Plus: change requests, incidents, push history, review history, and status timeline.

JSON Schema files are included at `schema/task.schema.json`, `schema/shard.schema.json`, and `schema/master.schema.json`.

## Task Status Flow

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
  ready ──► in-progress ──► implemented ──► reviewing ──► approved ──► pushed ──► merged
                                              │                                     │
                                              ▼                                     │
                                         fix-needed ──► fixing ──► fixed ───────────┘
                                                                     │
                                                                     └──► (re-review)

  Post-implementation changes:
  changes-requested ──► changes-implementing ──► changes-implemented ──► (re-review)
```

## Claude Code Integration

Taskflow was designed for AI-assisted development with Claude Code. The role templates (`.claude/roles/`) define specialized agent behaviors:

| Role | Skill | Purpose |
|------|-------|---------|
| Taskmaster | `/taskmaster` | Creates well-structured task specs |
| Implementer | `/task-implement` | Implements tasks from specs |
| Reviewer | `/task-review` | AI code review |
| Review Fixer | `/task-review-fix` | Fixes review feedback |
| Git Agent | `/task-git` | Branch, commit, push, PR, merge |
| Incident | `/task-incident` | Production incident tracking |
| Change Request | `/task-request-changes` | Post-implementation changes |

Each role reads from and writes to the same task JSON, creating a full audit trail visible in the dashboard.

## API (Programmatic Usage)

```typescript
import {
  resolveConfig,
  loadMaster,
  loadAllTasks,
  loadTaskById,
  startServer,
  initProject,
} from "taskflow";

const config = resolveConfig();
const master = loadMaster(config);
const tasks = loadAllTasks(config, master);

// Start dashboard server programmatically
startServer(config, 6006);
```

## License

MIT
