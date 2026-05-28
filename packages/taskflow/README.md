# insight-flow

> A workbench for AI-assisted task lifecycle management — CLI plus a server-rendered dashboard (vanilla JS).

insight-flow tracks AI-agent task work (specs, implementation, reviews, fixes, pushes, incidents) in sharded JSON files on disk, and serves a live server-rendered dashboard that visualizes the pipeline, lifecycle timeline, fix-loop hotspots, and per-task review history.

## What's new in 0.10.0

- **Prompt-injection guardrails** — `AGENT_SECURITY.md` ships with the package and propagates to all 8 agent roles via `AGENT_ENFORCEMENT.md`. Covers hidden-instruction suppression, URL exfiltration, action hijacking, and persona override.
- **No duplicate project cards** — Master registry now preserves the existing project UUID on re-registration; project cards no longer duplicate when a server restarts.
- **Overview grid layout** — Equal-width columns with a single-column fallback below 400 px viewport width.
- **Custom sounds work** — `/sounds/` endpoint restored with `Content-Length` header; dashboard tries your custom mp3 first and falls back to Web Audio API tones when no file is present.

See [CHANGELOG.md](../../CHANGELOG.md) for the full entry.

## Getting started

### 1. Install

```bash
# Global install (recommended — makes `insight-flow` available everywhere)
npm install -g insight-flow

# Or one-off via npx (no install needed)
npx insight-flow init   # initialize
npx insight-flow        # launch dashboard
```

### 2. Initialize your project

Run this inside your project root (the directory that contains your code):

```bash
insight-flow init
```

Add `--examples` to get commented `agents.extend` stubs in `taskflow.config.json` — useful when you want to wire up your stack-specific commands (typecheck, lint, PR CLI) right away:

```bash
insight-flow init --examples
```

Re-running `init` on an existing project is safe — it skips files that already exist, updates the `insight-flow` section of `CLAUDE.md`, and always regenerates `AGENT_ENFORCEMENT.md` from the current config.

### 3. What init creates

| Path | Description |
|------|-------------|
| `taskflow.config.json` | Project config (port, activity engine, agent permissions, …) |
| `workTasks/master.json` | Task metadata + shard index |
| `workTasks/tasks-N00-N09.json` | First task shard |
| `.claude/commands/taskmaster.md` | `/taskmaster` slash command |
| `.claude/commands/task-implement.md` | `/task-implement` slash command |
| `.claude/commands/task-review.md` | `/task-review` slash command |
| `.claude/commands/task-review-fix.md` | `/task-review-fix` slash command |
| `.claude/commands/task-human-review.md` | `/task-human-review` slash command |
| `.claude/commands/task-git.md` | `/task-git` slash command |
| `.claude/commands/task-incident.md` | `/task-incident` slash command |
| `.claude/commands/task-request-changes.md` | `/task-request-changes` slash command |
| `.claude/commands/taskmaster-change.md` | `/taskmaster-change` slash command |
| `.claude/roles/` | Role spec markdown templates (source of truth for each skill) |
| `AGENT_ENFORCEMENT.md` | Agent enforcement rules (git permissions, task-file mutation guard) — always regenerated from config |
| `CLAUDE.md` | Created or updated with insight-flow context block |
| `.claude/hooks/taskflow-activity.sh` | PostToolUse hook — feeds the activity panel |
| `.claude/hooks/taskflow-skill.sh` | UserPromptSubmit hook — tags events to active task |
| `.claude/hooks/taskflow-done.sh` | Stop hook — fires OS notification when agent finishes |
| `.claude/hooks/taskflow-classify.sh` | PreToolUse hook — enriches events with tool classification |
| `.claude/hooks/taskflow-notify.sh` | Stop hook — fires OS notification on notable task-status transitions |
| `.taskflow-activity.jsonl` | Ephemeral activity log (auto-gitignored) |

### 4. Connect Claude Code

Open Claude Code (or restart it if it was already running) in the project root. The slash commands from `.claude/commands/` are loaded automatically — you should see them in `/` autocomplete.

Verify by typing `/taskmaster` — it should launch the task creation flow.

If you added hooks and Claude Code was already open, **restart the session** for hooks to take effect (`/exit` then reopen).

### 5. Configure for your stack

insight-flow ships zero technology assumptions. Tell each agent how to run your project's quality gates and how to create PRs via `agents.extend` in `taskflow.config.json`:

```json
{
  "agents": {
    "extend": {
      "task-implement": ["Run `pnpm typecheck && pnpm lint && pnpm test` before marking implemented."],
      "task-git": ["For PR creation: `gh pr create --title \"<title>\" --body-file <path>`."]
    }
  }
}
```

After editing `taskflow.config.json`, run `insight-flow init` again to apply extensions to the role files.

See [Extending built-in agents](#extending-built-in-agents) for the full list of agent names and more examples.

### 6. Create your first task and launch the dashboard

```bash
# Create a task
insight-flow create --title "Add auth to dashboard" --type feat --priority high --tags web,auth

# Launch the dashboard
insight-flow            # opens http://localhost:6006
```

From here, use slash commands in Claude Code to drive the full lifecycle: `/taskmaster` → `/task-implement` → `/task-review` → `/task-git`.

## How it works

```
your-project/
├── taskflow.config.json     # where workTasks live, server port, activity engine
├── workTasks/
│   ├── master.json          # meta + shard index
│   ├── tasks-N00-N09.json   # tasks 0–9
│   ├── tasks-N10-N19.json   # tasks 10–19
│   └── N00-add-auth/        # spec + review files for each task
│       ├── TASK.md
│       └── CHECKLIST.md
└── .claude/
    ├── commands/            # slash commands generated by `insight-flow init`
    └── hooks/               # activity engine hook (optional)
```

When you run `insight-flow` (or `insight-flow ui`):

1. A local HTTP server starts on the configured port.
2. The server serves the server-rendered dashboard at `/`.
3. The dashboard reads `workTasks/*.json` from your configured `workDir` via `/api/work-tasks*`.
4. A WebSocket on `/ws` pushes file-change events so the UI updates live as you (or AI agents) edit tasks.

## CLI

The `insight-flow` binary is the **single canonical entry point** for all task tracking. Run it from any project root that has a `workTasks/` directory (or run `insight-flow init` first).

```
insight-flow                                    # Launch dashboard
insight-flow ui [--port N]                      # Same, with optional port override
insight-flow init                               # Initialize project

# Discovery
insight-flow current                            # Show active task
insight-flow next                               # Pick next actionable task by priority
insight-flow next-review                        # Pick next task needing review
insight-flow next-fix                           # Pick next fix-needed task
insight-flow next-change                        # Pick next changes-requested task
insight-flow list [--status ready]              # List tasks (optionally filtered)
insight-flow stats                              # Aggregate stats

# Task lifecycle
insight-flow create --title "..." --type feat|fix|rework [--priority high] [--tags a,b]
insight-flow status --id N00 --status <status> [--by agent-name]

insight-flow implement-start --id N00
insight-flow implement-end --id N00 --files "a.ts,b.ts"

insight-flow review-start --id N00 [--type ai|human]
insight-flow review-end --id N00 --verdict approved|fix-needed [--type ai|human] [--comment "..."]

insight-flow fix-start --id N00
insight-flow fix-end --id N00 --files "..." [--comment "..."]

# Post-implementation change requests
insight-flow change-request --id N00 --description "..."
insight-flow change-start --id N00
insight-flow change-end --id N00 --files "..." [--comment "..."]

# Git lifecycle
insight-flow push --id N00 --commit abc123 --message "..." [--branch name]
insight-flow mr-update --id N00 --url "https://..."
insight-flow merge --id N00
insight-flow done --id N00

# Incidents
insight-flow incident-create --id N03 --title "..." --severity critical|high|medium|low
insight-flow incident-status --id N03 --incident INC-001 --status investigating|production-fix|verified|closed
insight-flow incident-resolve --id N03 --incident INC-001 --rootCause "..." --fix "..."
insight-flow incident-list [--id N03]

# Migration / utility
insight-flow migrate                            # Migrate from legacy tracker.json
insight-flow prompt-build                       # Preview AGENT_ENFORCEMENT.md block (dry run)
insight-flow prompt-build --apply               # Write AGENT_ENFORCEMENT.md + patch role files
insight-flow help
insight-flow version
```

Run `insight-flow help` for the full list.

## Configuration

All configuration lives in `taskflow.config.json` at your project root. All keys have defaults — `taskflow.config.json` itself is optional. The keys below are the ones most commonly customised; `insight-flow init` scaffolds them for you.

### Full example

The block below shows every supported key with its default. Strip the `//` comments before using as valid JSON at runtime (or use `init --examples` which produces a commented version automatically):

```jsonc
{
  // ── Core ────────────────────────────────────────────────────────────────────
  "workDir": "workTasks",          // where task shards live
  "shardSize": 10,                 // tasks per shard file
  "projectName": "my-project",     // shown in dashboard header
  "rolesDir": ".claude/roles",     // where role templates are copied on init
  "server": {
    "port": 6006                   // HTTP + WebSocket port
  },

  // ── Activity engine ─────────────────────────────────────────────────────────
  "activityEngine": {
    "enabled": true,
    "logFile": ".taskflow-activity.jsonl",
    "maxEvents": 200,
    "phaseMarkers": true,          // emit phase events (edit-start, review-end, …)
    "hookEnrichment": true,        // enrich events with tool/file context from hooks
    "verbosity": "both"            // "milestones" | "detailed" | "both"
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  "notifications": {
    "browser": true,               // Web Notification API on status changes
    "cli": true,                   // allow insight-flow notify calls
    "sounds": {
      "enabled": true              // play sounds in the dashboard on notifications
    }
  },

  // ── Agent behaviour ─────────────────────────────────────────────────────────
  "agents": {
    "extend": {
      "task-implement": [],        // extra rules appended to task-implement prompt
      "task-review": [],
      "task-review-fix": [],
      "task-git": [],
      "taskmaster": [],
      "task-human-review": [],
      "task-incident": [],
      "task-request-changes": [],
      "taskmaster-change": []
    },
    "custom": [],                  // register custom slash-command agents
    "git": {
      "permissions": {
        "remoteOps": "allow",      // shorthand: "deny" blocks all origin-touching ops
        "createBranch": true,
        "checkout": true,
        "commit": true,
        "push": true,
        "forcePush": false,
        "merge": true,
        "deleteBranchLocal": true,
        "deleteBranchRemote": true,
        "createPR": true
      }
    }
  },

  // ── Multi-project master ────────────────────────────────────────────────────
  "master": {
    "url": "http://localhost:6100", // master server URL (multi-project mode)
    "port": 6100,                  // port when starting master locally
    "standalone": false,           // run this project as master (no remote)
    "startMasterLocally": false    // auto-start master server on dashboard launch
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  "events": {
    "dedupWindowSeconds": 60,      // suppress duplicate events within this window
    "hooks": {
      "edit-start": ["echo 'editing started'"],  // shell commands per event type
      "done": ["notify-send 'Task done'"]
    }
  }
}
```

### Core

| Key | Default | Purpose |
|-----|---------|---------|
| `workDir` | `"workTasks"` | Directory (relative to project root) where task JSON shards live. |
| `shardSize` | `10` | Tasks per shard file. Affects new shard rollovers only, not existing files. |
| `projectName` | inferred from `package.json` | Shown in the dashboard header. |
| `rolesDir` | `".claude/roles"` | Where role spec markdown templates are copied on `init`. |
| `server.port` | `6006` | HTTP/WebSocket port the dashboard listens on. |

### Activity engine

Controls the live activity panel in the dashboard. The panel shows what Claude Code is doing in real time (tool calls, file edits, phase transitions).

| Key | Default | Purpose |
|-----|---------|---------|
| `activityEngine.enabled` | `true` | Enable the activity panel. Set to `false` to hide it entirely. |
| `activityEngine.logFile` | `".taskflow-activity.jsonl"` | Ephemeral JSONL log written by the PostToolUse hook. Gitignored automatically. |
| `activityEngine.maxEvents` | `200` | Ring-buffer size for the in-memory activity feed. Older events are dropped. |
| `activityEngine.phaseMarkers` | `true` | Emit phase-boundary events (`edit-start`, `edit-end`, `review-start`, etc.) into the feed. |
| `activityEngine.hookEnrichment` | `true` | Enrich events with tool name and file context from Claude Code hook payloads. |
| `activityEngine.verbosity` | `"both"` | `"milestones"` — phase-marker events only; `"detailed"` — every tool call; `"both"` — all events. |

### Notifications

| Key | Default | Purpose |
|-----|---------|---------|
| `notifications.browser` | `true` | Web Notification API popups on task-status transitions (implemented, approved, fix-needed, merged). |
| `notifications.cli` | `true` | Enable `insight-flow notify` calls. Set to `false` to silence all OS/CLI notifications. |
| `notifications.sounds.enabled` | `true` | Play sounds in the dashboard tab when a notification fires. |

insight-flow uses a **three-tier notification model**. All notifications fire from hook scripts outside Claude's context — the AI agent itself never triggers a notification.

#### Tier 1 — Hook notifications (autonomous, zero AI involvement)

`insight-flow init` installs three hook scripts that fire OS notifications without any agent action:

| Hook | Trigger | Notification |
|---|---|---|
| `taskflow-notify.sh` (Stop) | Claude finishes a turn; task is in a notable status | `"<ID> <status>"` — e.g. `"N19 implemented"` |
| `lifecycle-agent-idle.sh` (Stop) | Claude finishes a turn (any turn) | `"Agent idle"` |
| `lifecycle-permission.sh` (PermissionRequest) | Claude needs your approval for a tool call | `"Approval required"` + terminal bell `\a` |

All three call `insight-flow notify` under the hood, which respects the `notifications.cli` flag and auto-detects the platform (`osascript` on macOS, `notify-send` on Linux, PowerShell on Windows).

#### Tier 2 — Browser notifications (dashboard tab)

When a watched task's status changes, the dashboard fires a `Notification` via the Web Notification API. A gear icon in the top bar opens a settings popover where you can:

- Toggle per-status notifications (`implemented`, `approved`, `fix-needed`, `merged`, `changes-requested`)
- Enable/disable sound
- Mute notifications when the tab is focused

Settings are persisted to `localStorage`. The browser prompts for permission on first load; if denied, no notifications fire and no console errors appear.

#### Tier 3 — User-authorized agent notifications (opt-in via config)

If you want the AI to send a notification at the end of a specific skill run, add it to `agents.extend` in `taskflow.config.json`. The agent will only send the notification if you instruct it to here — no notification fires by default from agent code.

```json
{
  "agents": {
    "extend": {
      "task-implement": ["When the task is fully implemented and the tracker is updated, run: insight-flow notify 'N<ID> implemented'"],
      "task-review-fix": ["After all blockers are fixed, run: insight-flow notify 'N<ID> fixed'"]
    }
  }
}
```

#### Disabling notifications

```json
{
  "notifications": {
    "browser": false,
    "cli": false
  }
}
```

When `notifications.cli` is `false`:
- `insight-flow notify` exits 0 silently on all platforms — no OS handler is invoked.
- Hook scripts that call `insight-flow notify` become no-ops automatically.
- `insight-flow init` skips the `taskflow-notify.sh` Stop hook installer.

#### `insight-flow notify` — the cross-platform primitive

Hooks and user-configured agent steps call this command directly:

```bash
insight-flow notify "N19 implemented"
insight-flow notify "N19 approved" --title "Review done" --project my-app
```

The command exits in <100 ms; errors are silently swallowed. It is safe to call from shell scripts with `2>/dev/null &` (fire-and-forget).

### Enabling the activity panel

The activity panel needs a Claude Code `PostToolUse` hook to emit events. Three states:

1. **Automatic** — running `insight-flow init` installs `.claude/hooks/taskflow-activity.sh` and registers it in `.claude/settings.local.json`.
2. **Retrofit existing project** — if you globally installed `insight-flow` or skipped init, run `insight-flow install-activity-hook` from the project root. The command is idempotent (re-running on a fully installed project is a no-op) and never overwrites unrelated PostToolUse hooks.
3. **Disabled by config** — setting `activityEngine.enabled` to `false` hides the panel entirely. The top-bar shows an `Engine: off (config)` chip so the state is explicit.

When the panel is enabled but the hook is missing, the dashboard renders a clear empty-state with the retrofit command instead of staying silently idle.

## Slash commands (Claude Code)

`insight-flow init` writes nine slash commands to `.claude/commands/`:

| Command                 | Purpose                             |
| ----------------------- | ----------------------------------- |
| `/taskmaster`           | Create a new task spec              |
| `/task-implement`       | Implement a task                    |
| `/task-review`          | AI code review                      |
| `/task-human-review`    | Record human review feedback        |
| `/task-review-fix`      | Fix issues from review              |
| `/task-git`             | Branch, commit, push, PR, merge     |
| `/task-incident`        | Track production incidents          |
| `/task-request-changes` | Post-implementation change requests |
| `/taskmaster-change`    | Edit an existing task spec          |

## Customizing agents

Add an `agents` key to your `taskflow.config.json` to inject project-specific rules into built-in agents and register entirely new custom agents.

### Extending built-in agents

`agents.extend` is a map of built-in agent names to arrays of extra rule strings. Each rule is appended to the corresponding role file under a `## Project Extensions` section. Re-running `insight-flow init` replaces (not duplicates) the section.

Valid agent names: `taskmaster`, `task-implement`, `task-review`, `task-review-fix`, `task-human-review`, `task-git`, `task-incident`, `task-request-changes`, `taskmaster-change`.

```json
{
  "agents": {
    "extend": {
      "task-implement": [
        "Only use pnpm, never npm or yarn",
        "All new files must have a corresponding test"
      ],
      "task-review": ["Reject any PR that introduces console.log statements"]
    }
  }
}
```

### Registering custom agents

`agents.custom` is an array of agent definitions. Each entry generates a Claude Code skill file at `.claude/commands/<name>.md` and adds a row for `/<name>` to the skills table in `CLAUDE.md`.

```json
{
  "agents": {
    "custom": [
      {
        "name": "deploy-check",
        "role": "Deploy Readiness Checker",
        "description": "Verify the project is ready for deployment.",
        "outputContract": "1. Run pnpm build\n2. Check env vars\n3. Run smoke tests\n4. Report READY or BLOCKED"
      }
    ]
  }
}
```

| Field            | Required | Description                                           |
| ---------------- | -------- | ----------------------------------------------------- |
| `name`           | yes      | Skill command name — used as `/<name>` in Claude Code |
| `role`           | yes      | One-line role header inside the skill file            |
| `description`    | yes      | Short description shown in CLAUDE.md                  |
| `outputContract` | no       | Workflow steps / output contract for the skill        |

After editing `taskflow.config.json`, re-run `insight-flow init` to apply changes.

### Git permission gates

`agents.git.permissions` controls which git operations the `task-git` agent may perform. Operations are split into **local** (safe, reversible — branch, checkout, commit, local delete) and **remote** (origin-touching — push, force-push, remote delete, PR creation).

**`remoteOps` shorthand** — set once to block or allow all remote operations:

```json
{
  "agents": {
    "git": {
      "permissions": {
        "remoteOps": "deny"
      }
    }
  }
}
```

Individual flags override `remoteOps`. This config allows push but blocks everything else remote:

```json
{
  "agents": {
    "git": {
      "permissions": {
        "remoteOps": "deny",
        "push": true
      }
    }
  }
}
```

**Flag reference:**

| Flag                 | Default | Remote? | Covered by `remoteOps`? |
| -------------------- | ------- | ------- | ----------------------- |
| `remoteOps`          | `"allow"` | —     | —                       |
| `createBranch`       | `true`  | no      | no                      |
| `checkout`           | `true`  | no      | no                      |
| `commit`             | `true`  | no      | no                      |
| `merge`              | `true`  | no      | no                      |
| `deleteBranchLocal`  | `true`  | no      | no                      |
| `push`               | `true`  | yes     | yes                     |
| `forcePush`          | `false` | yes     | yes                     |
| `deleteBranchRemote` | `true`  | yes     | yes                     |
| `createPR`           | `true`  | yes     | yes                     |

`insight-flow init` scaffolds the full block with `remoteOps: "allow"` so the field is visible from day one.

### Agent behaviour

| Key | Purpose |
|-----|---------|
| `agents.extend` | Map of agent name → array of extra rule strings appended to that agent's prompt at `init` time. Re-running `init` replaces (not duplicates) the injected section. Valid agent names: `taskmaster`, `task-implement`, `task-review`, `task-review-fix`, `task-human-review`, `task-git`, `task-incident`, `task-request-changes`, `taskmaster-change`. |
| `agents.custom` | Array of custom agent definitions (see [Registering custom agents](#registering-custom-agents)). Each entry generates a `.claude/commands/<name>.md` skill and a `CLAUDE.md` row. |
| `agents.git.permissions` | Git operation flags for the `task-git` agent (see [Git permission gates](#git-permission-gates)). |

### Multi-project master

These keys are only needed for the multi-project overview feature. See [Multi-project overview](#multi-project-overview) for the full setup.

| Key | Default | Purpose |
|-----|---------|---------|
| `master.url` | `undefined` | URL of the master server this project reports to (e.g. `"http://localhost:6100"`). |
| `master.port` | `6100` | Port the master server listens on when started locally. |
| `master.standalone` | `false` | Run this project's server as the master (single-project mode with master features). |
| `master.startMasterLocally` | `false` | Auto-start the master server process when the project dashboard launches. |

### Events

Controls how the CLI deduplicates agent events and lets you run custom shell commands on event boundaries.

| Key | Default | Purpose |
|-----|---------|---------|
| `events.dedupWindowSeconds` | `60` | Suppress duplicate events of the same type emitted within this window (seconds). |
| `events.hooks` | `{}` | Map of event type → array of shell commands to run when that event fires. Valid event types: `start`, `done`, `active`, `idle`, `edit-start`, `edit-end`, `research-start`, `research-end`, `review-start`, `review-end`, `git-start`, `git-end`. |

Example — run a script when any task starts and send a desktop notification when done:

```json
{
  "events": {
    "hooks": {
      "start": ["echo 'Task started' >> /tmp/taskflow.log"],
      "done": ["osascript -e 'display notification \"Task done\"'"]
    }
  }
}
```

## Programmatic API

```ts
import { startServer, resolveConfig, loadAllTasks } from "insight-flow";

const config = resolveConfig();
startServer(config); // or startServer(config, 7000) to override port

const tasks = loadAllTasks(config); // read every shard
```

## Multi-project launcher

`batch-ui` lets you start dashboards for several insight-flow projects at once from a single command, without opening separate terminals.

### Register your projects

Run this once inside each project folder after `insight-flow init`:

```bash
cd /path/to/my-app
insight-flow ui-batch-register
# → Registered "my-app" → /path/to/my-app

cd /path/to/another-app
insight-flow ui-batch-register
# → Registered "another-app" → /path/to/another-app
```

`ui-batch-register` reads `taskflow.config.json` in the current directory to verify it's a valid insight-flow project, then registers it in a global file at `~/.insight-flow/batch-ui.json` (or `%USERPROFILE%\.insight-flow\batch-ui.json` on Windows). The project label comes from the `projectName` field in the config, falling back to the folder name.

**Error cases** — the command exits with a clear message if:
- `taskflow.config.json` is not found in the current folder (not an insight-flow project)
- The config file contains invalid JSON
- The project is already registered (no-op, exits 0)

You can also register a project by explicit path without `cd`-ing:

```bash
insight-flow batch-ui --add "My App" /abs/path/to/project
```

To unregister a project from its folder:

```bash
cd /path/to/my-app
insight-flow ui-batch-unregister
# → Unregistered "my-app" → /path/to/my-app
```

Or by label from any directory:

```bash
insight-flow batch-ui --remove "My App"
```

To see all registered projects and verify each one points to the right folder:

```bash
insight-flow batch-ui --list
```

```
  Registered batch-ui projects (3):

  • my-app                   /path/to/my-app
                             config: my-app / workDir: workTasks
  • side-project             /path/to/side-project
                             config: side-project / workDir: tasks
  • stale-entry              /path/to/wrong-folder
                             config: (no config)
```

Each entry shows the resolved `projectName` and `workDir` from the folder's `taskflow.config.json`. If an entry shows `(no config)` or the wrong project name, re-register from the correct folder.

### Launch

From any directory, run:

```bash
insight-flow batch-ui
```

An interactive multi-select prompt appears:

```
Select projects to launch (↑↓ navigate, space toggle, enter confirm):

  > [x] my-app
    [x] another-app
    [ ] side-project

  2 of 3 selected
```

Use **↑ ↓** to move, **space** to toggle, **enter** to confirm. Previously selected projects are pre-checked on the next run.

Once you confirm, `batch-ui` assigns ports starting from `6007` and spawns a detached `insight-flow ui` process per project:

```
  [my-app]       http://localhost:6007
  [another-app]  http://localhost:6008
```

If a port is already in use (e.g. from a previous run), it is skipped automatically and the next free port is used:

```
(port 6007 was occupied, skipped)
  [my-app]       http://localhost:6008
```

If you run `batch-ui` again while servers are already up, already-running projects are skipped — only new or restarted projects are spawned:

```
  [my-app]       server on port 6007 already running, skipped
  [another-app]  http://localhost:6008
```

The browser opens each URL automatically. Pass `--no-open` to suppress:

```bash
insight-flow batch-ui --no-open
```

### Non-interactive / CI mode

When stdin is not a TTY (piped input, CI), `batch-ui` selects all registered projects and runs without a prompt:

```bash
echo "" | insight-flow batch-ui --no-open
```

### Platform notes

| Platform | Browser open command | Spawn binary |
|----------|----------------------|--------------|
| macOS    | `open <url>`         | `insight-flow` |
| Linux    | `xdg-open <url>`     | `insight-flow` |
| Windows  | `start "" <url>`     | `insight-flow.cmd` |

Spawned server processes are detached — they continue running after `batch-ui` exits.

### Stop all servers

To stop all servers started by the last `batch-ui` run:

```bash
insight-flow ui-batch-down
```

Output:
```
  [my-app]       PID 45231 (port 6007) — stopped
  [another-app]  PID 45232 (port 6008) — stopped

2 server(s) stopped.
Run `insight-flow batch-ui` to start them again.
```

`ui-batch-down` reads the PIDs written to `~/.insight-flow/batch-ui.json` during the last `batch-ui` launch, sends `SIGTERM` to each, and clears the list. Processes that have already exited are reported as "already stopped" (not an error). The PID list is cleared regardless, so running `ui-batch-down` twice is safe.

---

## Upgrading insight-flow

After installing a new version of insight-flow, run two commands to bring all your registered projects up to date:

```bash
npm install -g insight-flow@latest   # 1. install the new version
insight-flow bulk-init              # 2. re-scaffold role files in every registered project
insight-flow bulk-prompt-build      # 3. sync AGENT_ENFORCEMENT.md + agents.extend into role files
```

An interactive picker appears for each command so you can select which projects to update. To run against all projects without prompting (CI mode):

```bash
insight-flow bulk-init < /dev/null
insight-flow bulk-prompt-build < /dev/null
```

### bulk-init

Re-runs `insight-flow init` in every registered project to lay down updated role files and scaffolding:

```bash
insight-flow bulk-init
```

Output:

```
  ✓ my-app
  ✓ another-app
  ✗ stale-entry
    Error: no taskflow.config.json found in /path/to/wrong-folder

2/3 succeeded.
```

Pass `--force` to overwrite existing role files, or `--examples` to add commented `agents.extend` stubs:

```bash
insight-flow bulk-init --force
insight-flow bulk-init --examples
```

### bulk-prompt-build

Re-runs `insight-flow prompt-build --apply` in every registered project to sync `AGENT_ENFORCEMENT.md` and any `agents.extend` entries from `taskflow.config.json` into the project's role files:

```bash
insight-flow bulk-prompt-build
```

Output:

```
  ✓ my-app
  ✓ another-app

2/2 succeeded.
```

---

## Multi-project overview

When you run multiple `insight-flow ui` instances (one per project), the `insight-flow-master` package provides a live overview page that aggregates all of them into a single card grid.

### How it works

Project servers (push model):
1. On startup, `insight-flow ui` auto-starts `insight-flow-master` locally (if not already running) and registers with it.
2. On every file-change, the project server pushes its current state (current task, status counts, activity) to the master via HTTP POST.
3. If the master restarts and loses its registry, the next push returns 401 — the project server silently re-registers and retries.

The master:
- Holds an in-memory registry of all registered projects.
- Serves `GET /overview` — a live card grid, one card per project.
- Broadcasts `project-update` events via Socket.IO to the browser.

### Local setup

```bash
# Build the master package (once)
pnpm --dir packages/insight-flow-master run build

# Start your projects — master auto-starts on the first one
insight-flow ui                          # project A on :6006, master on :6100
# (in another terminal, different project dir)
insight-flow ui                          # project B on :6006, registers with existing master

# Open the overview
open http://localhost:6100/overview
# Or via any project server's /overview (renders as an iframe)
open http://localhost:6006/overview
```

### Remote master

Set `startMasterLocally: false` in `taskflow.config.json` to point at a master running on another machine:

```jsonc
{
  "master": {
    "url": "http://my-server:6100",
    "startMasterLocally": false
  }
}
```

### Standalone mode

To disable master integration entirely for a project:

```jsonc
{
  "master": { "standalone": true }
}
```

`GET /overview` returns 404 and no master process is started.

### Master standalone mode

The master itself can run in standalone mode (no new registrations accepted, overview shows existing cards only):

```json
// ~/.insight-flow/master.json
{ "port": 6100, "standalone": true }
```

## License

MIT
