# insight-flow Architecture Diagrams

Gemini-ready prompts for generating the four core architecture diagrams.
Copy any prompt below and paste it into Gemini (or any multimodal LLM) — each is fully self-contained.

> **Maintenance:** If any of the following areas change, rework the corresponding prompt in this file:
> - Agent roles, lifecycle commands, or status transitions → rework **Diagram 1**
> - Server federation (master server, project server routes, iframe integration, shard hydration) → rework **Diagram 2**
> - Notification hooks, config keys, or notification channels → rework **Diagram 3**
> - ActivityEngine, log format, enrichment hooks, verbosity config, or WebSocket push → rework **Diagram 4**

---

## Diagram 1 — Agent Lifecycle & Roles

```
Generate a Mermaid flowchart diagram titled "insight-flow: Agent Lifecycle & Roles".

The diagram shows how a human user moves a work item through the full lifecycle using Claude Code slash commands. Use the following accurate description:

ENTRY POINT
  User decides to create a work item.

TASKMASTER (/taskmaster)
  The user invokes /taskmaster. The agent runs `insight-flow create`, which:
    - assigns the next sequential Nxx ID (N00, N01, …)
    - creates workTasks/Nxx-<slug>/ with TASK.md and CHECKLIST.md
  The agent fills Problem · Goal · Scope · Implementation plan · Verification · Notes into TASK.md.
  Then calls /task-git to push the spec and optionally open a PR (spec-before-code pattern).

OPTIONAL BRANCH — spec changes before implementation:
  User may invoke /taskmaster-change at any point before or during implementation.
  The agent reads TASK.md + CHECKLIST.md and rewrites only the requested sections, then calls /task-git.

IMPLEMENT (/task-implement)
  User invokes /task-implement (or it is picked automatically via `insight-flow next`).
  Agent runs `insight-flow implement-start --id Nxx` (status → in-progress).
  Agent reads TASK.md + CHECKLIST.md, implements code changes, runs quality gates (typecheck/lint/test — project-supplied via agents.extend).
  Agent runs `insight-flow implement-end --id Nxx --files "..."` (status → implemented).
  Calls /task-git to commit and push.

REVIEW (/task-review)
  User invokes /task-review (or `insight-flow next-review`).
  Agent runs `insight-flow review-start --id Nxx --type ai --by task-review` (status → reviewing).
  Agent reads TASK.md, CHECKLIST.md, changed files. Reviews against checklist and quality gates.
  Verdict: approved OR fix-needed.
    If approved  → `insight-flow review-end --verdict approved` (status → approved). Calls /task-git.
    If fix-needed → `insight-flow review-end --verdict fix-needed`. Writes REVIEW.md with blockers. Calls /task-git.

HUMAN REVIEW (/task-human-review)  [optional, parallel to or after AI review]
  User invokes /task-human-review with their feedback.
  Agent runs `insight-flow review-start --type human --by task-human-review`.
  Writes/updates REVIEW.md. Runs `insight-flow review-end --verdict approved|fix-needed --type human`.
  Calls /task-git.

FIX (/task-review-fix)
  Triggered when status is fix-needed.
  Agent runs `insight-flow fix-start --id Nxx` (status → fixing).
  Reads REVIEW.md, fixes each blocker, re-runs quality gates.
  Runs `insight-flow fix-end --id Nxx` (status → fixed).
  Calls /task-git. Goes back to REVIEW phase.

CHANGES REQUESTED (/task-request-changes)  [post-approval change cycle]
  User invokes /task-request-changes with description.
  Agent runs `insight-flow change-request` (status → changes-requested).
  Implementation: /task-implement equivalent pattern via `change-start` / `change-end` (status → changes-implementing → changes-implemented).
  Calls /task-git.

GIT AGENT (/task-git)  [called by every other agent at the end]
  Creates/checks out branch <type>/Nxx-<slug>.
  Stages workTasks/*.json + changed source files.
  Commits with conventional commit message.
  Pushes to origin.
  Optionally creates PR (project-supplied command in agents.extend.task-git).
  Runs `insight-flow push --id Nxx --commit <hash> --message "..." --branch <branch>`.

INCIDENT (/task-incident)  [parallel track, linked to an existing task]
  `insight-flow incident-create --id Nxx --title "..." --severity critical|high|medium|low`.
  Creates fix/incident/Nxx-<slug> branch.
  After fix: `insight-flow incident-resolve --id Nxx --incident INC-001 --rootCause "..." --fix "..."`.
  Calls /task-git.

STATUS TRANSITIONS (show as a separate swim-lane or sub-graph):
  ready → in-progress → implemented → reviewing → approved → pushed → merged
                                           ↕ (fix cycle)
                                      fix-needed → fixing → fixed → (back to reviewing)
  approved → changes-requested → changes-implementing → changes-implemented → (back to reviewing)

QUALITY GATE NOTE:
  Every agent that produces code (task-implement, task-review-fix, task-request-changes) runs project-supplied quality gates (typecheck/lint/test) configured in taskflow.config.json agents.extend arrays. insight-flow ships no default commands — if none are configured the step is skipped and noted in the report.

Style: use boxes for agents/roles, diamonds for decisions (approved vs fix-needed), arrows for transitions. Group the agents in a vertical "Claude Code slash commands" swim-lane on the left and the status transitions in a horizontal swim-lane at the bottom. Use a neutral color palette.
```

---

## Diagram 2 — Server Federation (master ↔ project servers ↔ iframe UI)

```
Generate a Mermaid flowchart (or sequence diagram if clearer) titled "insight-flow: Server Federation Architecture".

The diagram shows how multiple project servers register with and push state to one master server, and how the UI is composed via iframe injection.

COMPONENTS

Master server  (the `insight-flow master` subcommand, default port 6100)
  - Runs as a long-lived singleton process.
  - Stores a lock file at ~/.insight-flow/master.lock  {pid, port, startedAt}.
  - Exposes HTTP routes:
      POST /api/register        → accepts {label, url}, returns {id}
      POST /api/projects/:id/update → accepts state snapshot, stores in-memory
      GET  /overview            → serves the master overview HTML (multi-project dashboard)
  - The overview page lists all registered projects with their last-pushed state (currentTaskId, currentTaskTitle, currentTaskStatus, taskCounts).

Project server  (one per project, default port 6006, configurable)
  - Runs `insight-flow ui` which calls startServer() in packages/taskflow/src/dashboard/server/index.ts.
  - On startup:
      1. Reads master.lock. If master is not alive → auto-spawns `insight-flow master` (detached child process), waits up to 3 s for it to be ready.
      2. Calls POST /api/register on master → receives masterId.
      3. Pushes initial state snapshot (currentTaskId, currentTaskTitle, currentTaskStatus, taskCounts, recentActivity[last 50]).
  - On every file-change in workTasks/ (debounced 100 ms via fs.watch):
      Calls POST /api/projects/:masterId/update with fresh state snapshot.
  - If master returns 401 on an update → re-registers (lost session) then retries update.
  - config.master.standalone = true → skips all master integration.

Project server HTTP routes:
  GET  /                          → React + Vite SPA shell (dist/dashboard); any unmatched route falls through to it
  GET  /assets/*                  → hashed SPA assets (js/css) from dist/dashboard/assets
  GET  /overview                  → iframe proxy: serves an HTML page containing <iframe src="http://localhost:6100/overview">
  GET  /config                    → server-rendered config viewer (still HTML; not part of the SPA)
  GET  /api/work-tasks            → lists shard JSON files in workTasks/
  GET  /api/work-tasks/:file      → returns hydrated shard JSON (reviews.json + incidents.json merged in on-the-fly)
  GET  /api/activity              → returns recent activity events (last N from ActivityEngine ring buffer)
  GET  /api/task-doc              → read-only markdown for a task's TASK/CHECKLIST/REVIEW/ANALYSIS (whitelisted + traversal-guarded)
  GET  /sse  (Server-Sent Events) → pushes snapshot / activity / file-change / status frames to the SPA

UI composition:
  - The project dashboard at / is a React + Vite SPA (source in packages/taskflow/src/dashboard/client, built into dist/dashboard, served same-port). It has a nav link to /overview. (/config + /overview remain server-rendered HTML.)
  - /overview returns a minimal HTML page that embeds the master server's overview UI in a full-viewport <iframe>.
  - This means the master UI is injected into the project server's browser session without any JavaScript cross-origin calls — the iframe loads the master's own HTML directly.

State snapshot shape pushed to master:
  { currentTaskId, currentTaskTitle, currentTaskStatus, taskCounts: {[status]: count}, recentActivity: ActivityEvent[] }

Shard hydration (hydrateShardJson):
  When a project server serves GET /api/work-tasks/:file, it reads the shard JSON, then for each task in tasks[]:
    - Reads workTasks/Nxx-<slug>/reviews.json → injects task.reviews[]
    - Reads workTasks/Nxx-<slug>/incidents.json → injects task.incidents[]
  This keeps shard files lean (only summary fields: reviewCount, lastReviewVerdict, openIncidentCount) while the API always returns full data.

Style: draw the master server as a central hub. Draw 2–3 project server boxes around it with bidirectional arrows labelled with the HTTP calls. Show the browser client connected to the project server via WebSocket and HTTP. Show the iframe injection path with a dashed arrow from the project server's /overview endpoint into the browser's iframe → master server. Show the lock file as a file icon near the master server.
```

---

## Diagram 3 — Notification Service

```
Generate a Mermaid flowchart titled "insight-flow: Notification Service".

The diagram shows how OS-level desktop notifications and browser push notifications are triggered when Claude Code finishes a turn on a task.

COMPONENTS

Claude Code harness
  - Runs the user's Claude Code session.
  - Executes registered hooks at lifecycle events.
  - Stop hook: fires every time Claude finishes a response turn.

taskflow-notify.sh  (.claude/hooks/taskflow-notify.sh)
  - A bash script registered as a Claude Code Stop hook in .claude/settings.local.json.
  - Installed by `insight-flow init` (or re-installed idempotently via `insight-flow init`).
  - On every Stop event:
      1. Runs `insight-flow current` → captures JSON with current task id + status.
      2. Extracts task id and status via grep/cut (no jq dependency).
      3. case $STATUS in — if status ∈ { implemented | approved | fix-needed | fixed | merged | changes-implemented }
           → calls `insight-flow notify "<taskId> <status>"`.
         Otherwise → falls through, exits 0 silently.
      4. Always exits 0 — never blocks the Claude session.
  The status check and conditional logic live entirely in this shell script, not in the CLI.

insight-flow notify  (CLI command)
  - Accepts a message string as its first positional argument (the hook passes "<taskId> <status>").
  - If config.notifications.cli === false → exits 0 immediately (no-op).
  - Otherwise fires a platform-specific OS desktop notification (fire-and-forget, swallows all errors):
      macOS   → osascript: `display notification "<message>" with title "<project>"`
      Linux   → notify-send "<title>" "<message>"
      Windows → PowerShell ToastNotificationManager
  - Does NOT read master.json or check task status — that logic is in the hook script above.

Browser notifications  (separate channel)
  - The project server dashboard HTML uses the Web Notifications API directly (no Service Worker).
  - On page load it calls Notification.requestPermission() if permission is not yet granted.
  - When the WebSocket receives an "update" event and the task status changes to a notable value, the dashboard JS fires new Notification(title, { silent: !sound }).
  - config.notifications.browser = false → the dashboard skips notification registration entirely.

Disabling notifications:
  - OS notifications:      set notifications.cli: false in taskflow.config.json, then re-run `insight-flow init`.
  - Browser notifications: set notifications.browser: false in taskflow.config.json, then re-run `insight-flow init`.
  - Both channels are independent; either can be disabled without affecting the other.

Installation / reinstallation:
  - `insight-flow init` is idempotent. Re-running it re-registers hooks if missing, skips if already registered.
  - The notify hook is registered in settings.local.json (not settings.json) so it stays out of version control.

Style: show the Claude Code harness at the top. Arrow down to the Stop hook shell script box. Inside the hook box show the three internal steps: "insight-flow current → extract status → case $STATUS". Place the condition diamond (notable status?) inside or immediately after the hook box — yes branch leads to `insight-flow notify` CLI box → OS notification bubble; no branch exits 0. Separately, show the browser client receiving a WebSocket "update" event and calling new Notification() via the Web Notifications API (label it "Web Notifications API — no Service Worker"). Connect both notification channels back to a shared "taskflow.config.json notifications block" config box with dashed arrows labelled with the config key that gates each channel (notifications.cli / notifications.browser).
```

---

## Diagram 4 — Activity Engine, Milestones & Logging Pipeline

```
Generate a Mermaid flowchart titled "insight-flow: Activity Engine, Milestones & Logging Pipeline".

The diagram shows how activity events flow from agents through hooks, into a log file, through the ActivityEngine ring buffer, out via the WebSocket, and into the dashboard's activity feed.

COMPONENTS

Agent (any insight-flow slash command)
  - At key phase boundaries, the agent calls:
      `insight-flow log-activity "<message>" --phase <name>`
    Example phases: start, research-start, research-end, edit-start, edit-end, done.
  - Maximum 5–10 calls per task. Fire-and-forget (~50 ms each).
  - Controlled by activityEngine.phaseMarkers in taskflow.config.json; agents skip all calls if phaseMarkers = false.
  - Phase markers are "milestone" events (verbosity tier: milestones).

Claude Code hooks (enrichment hooks)  — separate from agents
  Three hooks installed by `insight-flow init` when activityEngine.hookEnrichment = true:
    UserPromptSubmit hook  → fires when user submits a prompt; logs a "session" event (verbosity tier: detailed).
    PreToolUse hook        → fires before each tool call; logs a "tool-start" event (verbosity tier: detailed).
    Stop hook (enrichment) → fires when Claude finishes a turn; logs a "session-end" event (verbosity tier: detailed).
  These hooks write directly to .taskflow-activity.jsonl via `insight-flow log-activity`.
  config.activityEngine.hookEnrichment = false → enrichment hooks are not installed.

.taskflow-activity.jsonl  (ephemeral log file)
  - Lives in the project root. Added to .gitignore by `insight-flow init`.
  - Each line is a JSON ActivityEvent: { timestamp, phase, message, taskId?, source? }.
  - Cleared (truncated to 0 bytes) each time the project server starts (ActivityEngine.start()).
  - Two writers: agents (via `insight-flow log-activity`) and the enrichment hooks.

ActivityEngine  (packages/taskflow/src/server/activity.ts)
  - Instantiated by the project server on startup.
  - Watches .taskflow-activity.jsonl with fs.watch + a 500 ms fallback poll.
  - Reads new lines incrementally (cursor = linesProcessed, not events.length, so ring-buffer eviction doesn't lose the cursor).
  - Maintains an in-memory ring buffer of maxEvents events (default 200).
  - On each new event: pushes to ring buffer, notifies all registered listeners.

Verbosity filtering  (activityEngine.verbosity in taskflow.config.json)
  Values: "milestones" | "detailed" | "both"
  - milestones → only phase-marker events (from agents).
  - detailed   → only enrichment-hook events.
  - both       → all events (default).
  The server applies this filter when serving /api/activity and when pushing events over the WebSocket.

WebSocket push  (socket.io, project server)
  - ActivityEngine.onEvent() listener → emits "activity" event to all connected browser clients.
  - Also emits "update" event on file-change (separate from activity).

/api/activity endpoint
  - GET /api/activity → returns ActivityEngine.getRecentEvents() (up to maxEvents, filtered by verbosity).

Dashboard activity feed  (packages/taskflow/src/dashboard/client/ActivityFeed.tsx + activity.ts)
  - On /sse "snapshot" frame: seeds the feed from the server's recent events.
  - On /sse "activity" frame: prepends the new event to the feed in real-time, no full reload.
  - Events show: timestamp, phase badge (color-coded), message, optional taskId chip.

State push to master
  - On file-change, the project server also calls buildProjectState() which includes recentActivity.slice(-50).
  - This means the master overview sees the last 50 activity events from each registered project.

Key config knobs (all in taskflow.config.json activityEngine block):
  enabled        — false disables the entire pipeline (NoopActivityEngine used).
  logFile        — path to the JSONL file (default .taskflow-activity.jsonl).
  maxEvents      — ring buffer size (default 200).
  phaseMarkers   — false suppresses agent milestone calls.
  hookEnrichment — false skips UserPromptSubmit / Stop / PreToolUse enrichment hooks.
  verbosity      — milestones | detailed | both.

Style: use a vertical pipeline layout. At the top: two parallel input sources (Agent phase calls on the left, Enrichment hooks on the right). Both arrows point down to the .taskflow-activity.jsonl file. From the file, an arrow goes to the ActivityEngine box (show fs.watch + poll + ring buffer inside it). From the ActivityEngine, fan out to three outputs: /api/activity HTTP endpoint, WebSocket "activity" event → browser dashboard, and state push to master server. Add the config knobs as a side panel connected to the ActivityEngine and input sources with dashed arrows labelled with the config key that gates each connection.
```
