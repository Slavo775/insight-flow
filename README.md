# insight-flow

A workbench for AI-assisted task lifecycle management — CLI plus a built-in live React dashboard.

`insight-flow` gives any project structured, auditable, visualizable task execution. One command to init, one command to launch the dashboard. Designed for Claude Code workflows but works standalone.

> **New in 2.0.0:** a visual **flow** system that governs every project's lifecycle (flow map + editor), an **install/uninstall engine** for agents & modules, the everything-is-a-module **agent composition v2** model with user-space customization, and a React/Vite dashboard. See [What You Get](#what-you-get) below and the full [CHANGELOG](packages/taskflow/CHANGELOG.md) (incl. breaking-change migrations).

## Quick Start

```bash
# Initialize in your project
npx insight-flow init

# Create your first task
insight-flow create --title "Add user auth" --type feat --priority high --tags auth,api

# Launch the dashboard
insight-flow
```

The dashboard opens at `http://localhost:6006` with live-reload — create tasks in one terminal, see them appear instantly in the browser.

## Install

```bash
# Global
npm install -g insight-flow

# Project dev dependency
npm install -D insight-flow

# Or just use npx
npx insight-flow init
```

## What You Get

After `insight-flow init`, your project has:

```
your-project/
├── taskflow.config.json        # Configuration
├── insightFlow/
│   ├── workTasks/
│   │   ├── master.json         # Meta + shard index
│   │   ├── tasks-N00-N09.json  # Task shard (tasks 0-9)
│   │   └── N00-my-task/        # Task folder (TASK.md, CHECKLIST.md)
│   └── events/                 # Daily JSONL event backups
└── .claude/
    ├── commands/               # Slash commands (/taskmaster, /task-implement, …)
    ├── roles/                  # Agent role templates (for Claude Code)
    └── hooks/                  # Activity + lifecycle hook scripts
```

And you get:

- **Flows** — define and edit your project's lifecycle visually (flow map + editor: nodes, ports, custom states, terminal "done" nodes). Tasks bind to a flow, and kanban columns, status badges, pickers, and agent prompts all read that flow's status set.
- **Install / uninstall engine** — derive an install plan from a flow and run it with live progress; install or uninstall agents & modules straight from the dashboard, with templated `${VAR}` inputs and overwrite undo.
- **Agent composition v2** — an everything-is-a-module registry (with `mcp` / `hook` / `skill` / bundle kinds) plus user-space registries and CRUD forms to author your own modules, agents, and projects.
- **Multi-project hub** — a single-origin, installable PWA that switches between all your insight-flow projects: it reverse-proxies each dashboard at `/project/<id>/`, starts stopped projects, creates new ones from the browser, and streams live status + unified notifications (works from your phone via `INSIGHT_FLOW_TRUSTED_HOSTS`). Run `insight-flow master` → `http://localhost:6100/overview`.

## Dashboard

```bash
insight-flow              # Launch dashboard (default)
insight-flow ui           # Same thing
insight-flow ui --port 8080  # Custom port
```

The built-in dev server:

- Serves task JSON as a REST API (`/api/work-tasks`, `/api/work-tasks/:file`)
- Renders a Kanban board, stats, timeline, task-detail pages, the flow map + flow editor, and the module/agent browser
- Watches the tracker directory (`insightFlow/workTasks/`, legacy `workTasks/`) for changes and live-reloads over a native Server-Sent Events (SSE) channel (`/sse`)
- Auto-opens the browser

## CLI Reference

### Task Lifecycle

```bash
# Create
insight-flow create --title "..." --type feat|fix|rework --priority critical|high|medium|low --tags a,b

# Status transitions
insight-flow status --id N00 --status ready|in-progress|implemented|... [--by agent-name]

# Implementation tracking
insight-flow implement-start --id N00
insight-flow implement-end --id N00 --files "src/a.ts,src/b.ts"

# Code review
insight-flow review-start --id N00 [--type ai|human] [--by reviewer]
insight-flow review-end --id N00 --verdict approved|fix-needed [--comment "..."]

# Fix cycle
insight-flow fix-start --id N00
insight-flow fix-end --id N00 --files "src/a.ts" [--comment "..."]

# Git integration
insight-flow push --id N00 --commit abc123 --message "feat: ..." [--branch name]
insight-flow mr-update --id N00 --url "https://github.com/.../pull/1"
insight-flow merge --id N00
insight-flow done --id N00
```

### Change Requests (post-implementation)

```bash
insight-flow change-request --id N00 --description "Fix the button color"
insight-flow change-start --id N00
insight-flow change-end --id N00 --files "src/button.tsx" [--comment "..."]
insight-flow next-change
```

### Incidents

```bash
insight-flow incident-create --id N00 --title "API 500 on login" --severity critical
insight-flow incident-status --id N00 --incident INC-001 --status investigating
insight-flow incident-resolve --id N00 --incident INC-001 --rootCause "..." --fix "..."
insight-flow incident-list [--id N00]
```

### Queries

```bash
insight-flow current          # Show active task
insight-flow list             # List all tasks
insight-flow list --status ready  # Filter by status
insight-flow stats            # Aggregate statistics
insight-flow next             # Pick next actionable task (smart priority)
insight-flow next-review      # Pick next task awaiting review
insight-flow next-fix         # Pick next task needing fixes
```

### Other

```bash
insight-flow init             # Initialize insight-flow in current project
insight-flow rename --id N00 --title "..." [--type ...] [--priority ...]  # Update a task's title/type/priority
insight-flow set-flow --id N00 --flow <flowId>   # Bind a task to a flow
insight-flow migrate          # Migrate from legacy tracker.json format
insight-flow migrate-layout   # Move an existing project to the insightFlow/ layout
insight-flow help             # Show help
insight-flow version          # Show version
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

| Key             | Default                         | Description                               |
| --------------- | ------------------------------- | ----------------------------------------- |
| `workDir`       | `workTasks`                     | Legacy tasks dir (ignored once `insightFlow/` exists) |
| `shardSize`     | `10`                            | Tasks per shard file (N00-N09, etc.)      |
| `projectName`   | from `package.json` or dir name | Shown in dashboard header                 |
| `rolesDir`      | `.claude/roles`                 | Where role templates are copied on `init` |
| `server.port`   | `6006`                          | Dashboard HTTP/WebSocket port             |

> For the full configuration reference — activity engine, notifications, git permission gates, events, multi-project master — see [`packages/taskflow/README.md`](packages/taskflow/README.md#configuration).

### Extending agents with project-specific commands

insight-flow's agent prompts are **technology-agnostic** — no specific package-manager, language-toolchain, or git-host commands are shipped. To wire up your stack's commands (typecheck / lint / test / PR-create / etc.), add them to `taskflow.config.json` under `agents.extend.<agent-name>` as string arrays. Each string is appended to the loaded prompt for that agent at runtime.

```jsonc
{
  "agents": {
    "extend": {
      "task-implement": ["Run <your-quality-gate-commands> before marking implemented."],
      "task-git":       ["For PR creation, run <your-host-CLI-command>."]
    }
  }
}
```

`insight-flow init --examples` writes commented stubs for every built-in agent so you have a starting template. Worked examples for TypeScript+pnpm+GitHub, Python+uv+GitLab, and Go+GitHub are in `CLAUDE.md`. The PR-API per-host examples (curl snippets for GitHub REST, GitLab REST, no-CLI fallback) are in `PR_API.md` — all explicitly marked illustrative, none shipped as defaults.

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

insight-flow was designed for AI-assisted development with Claude Code. The role templates (`.claude/roles/`) define specialized agent behaviors:

| Role            | Skill                   | Purpose                            |
| --------------- | ----------------------- | ---------------------------------- |
| Taskmaster      | `/taskmaster`           | Creates well-structured task specs |
| Spec Editor     | `/taskmaster-change`    | Modifies an existing task spec     |
| Implementer     | `/task-implement`       | Implements tasks from specs        |
| Reviewer        | `/task-review`          | AI code review                     |
| Human Reviewer  | `/task-human-review`    | Records human review feedback      |
| Review Fixer    | `/task-review-fix`      | Fixes review feedback              |
| Git Agent       | `/task-git`             | Branch, commit, push, PR, merge    |
| Incident        | `/task-incident`        | Production incident tracking       |
| Change Request  | `/task-request-changes` | Post-implementation changes        |

Each role reads from and writes to the same task JSON, creating a full audit trail visible in the dashboard.

## Composer MCP

**The composer MCP server lets an AI assistant help you set up and customize insight-flow itself.** Instead of clicking through the dashboard to wire up your modules, agents, and flows, you ask Claude Code in plain language ("add a security-review agent to my flow", "install that flow") and it does it by calling the composer directly. It exposes insight-flow's modules, agents, and flows (built-in and custom) as [Model Context Protocol](https://modelcontextprotocol.io) tools — list, author, edit, install, uninstall, delete — the same operations as the dashboard, agent-callable. It runs over **stdio** (no port):

```bash
insight-flow mcp
```

Register it in your project's `.mcp.json` (or install the built-in `mcp-composer` module, which writes exactly this):

```jsonc
{
  "mcpServers": {
    "composer": { "command": "insight-flow", "args": ["mcp"] }
  }
}
```

See the [Composer MCP docs](https://slavo775.github.io/insight-flow/docs/composer-mcp/) for the full tool reference.

## API (Programmatic Usage)

```typescript
import {
  resolveConfig,
  loadMaster,
  loadAllTasks,
  loadTaskById,
  startServer,
  initProject,
} from "insight-flow";

const config = resolveConfig();
const master = loadMaster(config);
const tasks = loadAllTasks(config, master);

// Start dashboard server programmatically
startServer(config, 6006);
```

## Development

- **[Local testing with yalc](docs/local-testing-with-yalc.md)** — publish the package to a local store and install it into a test project (`pnpm yalc:publish` → `npx yalc add insight-flow` → `pnpm yalc:push`) before cutting a real release.
- **[Architecture diagrams](docs/architecture-diagrams.md)** — system diagrams (agent lifecycle, server federation, notifications, activity engine).

## License

MIT
