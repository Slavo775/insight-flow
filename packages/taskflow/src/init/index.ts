import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import type { TaskflowConfig } from "../types.js";
import { resolvePackageAsset } from "../paths.js";

export function initProject(cwd: string = process.cwd()): void {
  const configPath = resolve(cwd, "taskflow.config.json");

  // 1. Write config
  const config: TaskflowConfig = {
    workDir: "workTasks",
    shardSize: 10,
    projectName: inferName(cwd),
    rolesDir: ".claude/roles",
    server: { port: 6006 },
    activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
  };

  if (existsSync(configPath)) {
    console.log("taskflow.config.json already exists, skipping config creation.");
  } else {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log("Created taskflow.config.json");
  }

  // 2. Create workTasks dir + master.json
  const workDir = resolve(cwd, config.workDir);
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
    console.log(`Created ${config.workDir}/`);
  }

  const masterPath = resolve(workDir, "master.json");
  if (!existsSync(masterPath)) {
    const master = {
      meta: {
        nextId: 0,
        currentTaskId: null,
        nextIncidentId: 1,
        shards: ["tasks-N00-N09.json"],
      },
    };
    writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n");

    const shard = { range: { from: 0, to: 9 }, tasks: [] as unknown[] };
    writeFileSync(resolve(workDir, "tasks-N00-N09.json"), JSON.stringify(shard, null, 2) + "\n");
    console.log("Created master.json + initial shard");
  }

  // 3. Copy role templates (per file, so we can report created vs skipped)
  const rolesDir = resolve(cwd, config.rolesDir);
  const templateRolesDir = resolvePackageAsset("templates/roles");

  if (existsSync(templateRolesDir)) {
    if (!existsSync(rolesDir)) {
      mkdirSync(rolesDir, { recursive: true });
    }
    const entries = readdirSync(templateRolesDir).filter((f) => f.endsWith(".md"));
    let created = 0;
    let skipped = 0;
    for (const file of entries) {
      const dest = resolve(rolesDir, file);
      if (existsSync(dest)) {
        skipped++;
      } else {
        copyFileSync(resolve(templateRolesDir, file), dest);
        created++;
      }
    }
    if (created > 0) {
      console.log(`Copied ${created} role template${created === 1 ? "" : "s"} to ${config.rolesDir}/`);
    }
    if (skipped > 0) {
      console.log(`Skipped ${skipped} existing role file${skipped === 1 ? "" : "s"} in ${config.rolesDir}/`);
    }
  }

  // 4. Generate Claude Code skill commands
  const commandsDir = resolve(cwd, ".claude", "commands");
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
  }

  const skills: Record<string, string> = {
    "taskmaster.md": SKILL_TASKMASTER,
    "task-implement.md": SKILL_IMPLEMENT,
    "task-review.md": SKILL_REVIEW,
    "task-review-fix.md": SKILL_REVIEW_FIX,
    "task-human-review.md": SKILL_HUMAN_REVIEW,
    "task-git.md": SKILL_GIT,
    "task-incident.md": SKILL_INCIDENT,
    "task-request-changes.md": SKILL_REQUEST_CHANGES,
    "taskmaster-change.md": SKILL_TASKMASTER_CHANGE,
  };

  let skillCount = 0;
  for (const [file, content] of Object.entries(skills)) {
    const skillPath = resolve(commandsDir, file);
    if (!existsSync(skillPath)) {
      writeFileSync(skillPath, content);
      skillCount++;
    }
  }
  if (skillCount > 0) {
    console.log("Created " + skillCount + " Claude Code skill commands in .claude/commands/");
  } else {
    console.log("Claude Code skill commands already exist, skipping.");
  }

  // 5. Generate or append to CLAUDE.md
  const claudeMdPath = resolve(cwd, "CLAUDE.md");
  const taskflowSection = generateClaudeMd(config);
  const MARKER = "<!-- taskflow:start -->";
  const MARKER_END = "<!-- taskflow:end -->";

  if (!existsSync(claudeMdPath)) {
    writeFileSync(claudeMdPath, MARKER + "\n" + taskflowSection + MARKER_END + "\n");
    console.log("Created CLAUDE.md with insight-flow context");
  } else {
    const existing = readFileSync(claudeMdPath, "utf-8");
    if (existing.includes(MARKER)) {
      // Replace existing taskflow section
      const before = existing.substring(0, existing.indexOf(MARKER));
      const afterIdx = existing.indexOf(MARKER_END);
      const after = afterIdx >= 0 ? existing.substring(afterIdx + MARKER_END.length) : "";
      writeFileSync(claudeMdPath, before + MARKER + "\n" + taskflowSection + MARKER_END + after);
      console.log("Updated insight-flow section in existing CLAUDE.md");
    } else {
      // Append taskflow section
      writeFileSync(
        claudeMdPath,
        existing.trimEnd() + "\n\n" + MARKER + "\n" + taskflowSection + MARKER_END + "\n",
      );
      console.log("Appended insight-flow section to existing CLAUDE.md");
    }
  }

  // 6. Generate Claude Code hook for activity engine
  if (config.activityEngine?.enabled !== false) {
    generateActivityHook(cwd, config);
  }

  // 7. Add .taskflow-activity.jsonl to .gitignore
  const gitignorePath = resolve(cwd, ".gitignore");
  const activityLogEntry = ".taskflow-activity.jsonl";
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, "utf-8");
    if (!gitignore.includes(activityLogEntry)) {
      writeFileSync(gitignorePath, gitignore.trimEnd() + "\n" + activityLogEntry + "\n");
      console.log("Added " + activityLogEntry + " to .gitignore");
    }
  } else {
    writeFileSync(gitignorePath, activityLogEntry + "\n");
    console.log("Created .gitignore with " + activityLogEntry);
  }

  console.log(
    "\ninsight-flow initialized! Run 'insight-flow create --title \"My task\" --type feat' to create your first task.",
  );
  console.log("Run 'insight-flow' to launch the dashboard.\n");
}

function generateClaudeMd(config: TaskflowConfig): string {
  return `## insight-flow

This project uses **insight-flow** for AI-assisted task lifecycle management.

## Task System

Tasks are tracked in \`${config.workDir}/\` as sharded JSON files. Use the insight-flow CLI or slash commands to manage them.

## Commands

\`\`\`bash
insight-flow create --title "..." --type feat|fix|rework --priority high|medium|low --tags a,b
insight-flow current                    # Show active task
insight-flow list                       # List all tasks
insight-flow stats                      # Aggregate statistics
insight-flow next                       # Pick next actionable task
insight-flow                            # Launch dashboard at http://localhost:${config.server.port}
\`\`\`

## Slash Commands (Claude Code Skills)

| Command | Purpose |
|---------|---------|
| \`/taskmaster\` | Create a new task spec (TASK.md + CHECKLIST.md) |
| \`/task-implement\` | Implement a task from its spec |
| \`/task-review\` | AI code review of implemented task |
| \`/task-human-review\` | Record human review feedback |
| \`/task-review-fix\` | Fix issues from review |
| \`/task-git\` | Branch, commit, push, PR, merge |
| \`/task-incident\` | Track production incidents |
| \`/task-request-changes\` | Request post-implementation changes |
| \`/taskmaster-change\` | Modify an existing task spec |

## Task Lifecycle

\`\`\`
ready -> in-progress -> implemented -> reviewing -> approved -> pushed -> merged
                                          |
                                     fix-needed -> fixing -> fixed -> (re-review)
\`\`\`

## Conventions

- Task IDs: N00, N01, N02, ...
- Task folders: \`${config.workDir}/Nxx-short-title/\` containing TASK.md + CHECKLIST.md
- Branches: \`<type>/Nxx-short-title\` (e.g., \`feat/N00-add-auth\`)
- Commits: conventional commits (feat, fix, refactor, docs, chore, etc.)
- Tracker commands: \`insight-flow <command>\` (run \`insight-flow help\` for the full list)
`;
}

const SKILL_TASKMASTER = `ROLE: insight-flow Taskmaster (Work Item Generator)

You generate well-structured work items (bugs, features, rework). Each task gets a unique Nxx ID and lives in the workTasks directory.

INPUT: Human provides task type (fix/feat/rework), scope description, optional priority.
Run \`insight-flow current\` to see the current state.

OUTPUT:
1. Run: \`insight-flow create --title "..." --type fix|feat|rework --priority high|medium|low --tags tag1,tag2\`
2. Write TASK.md + CHECKLIST.md in the created folder.
3. Call /task-git to push task documents.

$ARGUMENTS
`;

const SKILL_IMPLEMENT = `ROLE: insight-flow Task Implementer

You implement work items from workTasks/ specifications. Follow the spec exactly.

INPUT: Task ID or run \`insight-flow next\` to pick the next task.

WORKFLOW:
1. \`insight-flow next\` or use provided ID
2. \`insight-flow implement-start --id Nxx\`
3. Read TASK.md + CHECKLIST.md from the task folder
4. Implement the plan, run quality gates
5. \`insight-flow implement-end --id Nxx --files "file1.ts,file2.ts"\`
6. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REVIEW = `ROLE: insight-flow Task Reviewer

You perform AI code review on implemented tasks.

INPUT: Task ID or run \`insight-flow next-review\` to pick the next reviewable task.

WORKFLOW:
1. \`insight-flow next-review\` or use provided ID
2. \`insight-flow review-start --id Nxx --type ai --by task-review\`
3. Read TASK.md, CHECKLIST.md, and all changed files
4. Review against checklist, check quality gates
5. \`insight-flow review-end --id Nxx --verdict approved|fix-needed --comment "..."\`
6. If fix-needed, write REVIEW.md with findings
7. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REVIEW_FIX = `ROLE: insight-flow Review Fixer

You fix issues identified during code review.

INPUT: Task ID or run \`insight-flow next-fix\`.

WORKFLOW:
1. \`insight-flow next-fix\` or use provided ID
2. \`insight-flow fix-start --id Nxx\`
3. Read REVIEW.md for blockers
4. Fix each blocker, run quality gates
5. \`insight-flow fix-end --id Nxx --files "..." --comment "..."\`
6. Call /task-git to push

$ARGUMENTS
`;

const SKILL_HUMAN_REVIEW = `ROLE: insight-flow Human Review Recorder

You record the human's review feedback on a task.

INPUT: Task ID (optional) + human's review comments.

WORKFLOW:
1. \`insight-flow current\` if no ID given
2. \`insight-flow review-start --id Nxx --type human --by task-human-review\`
3. Write/update REVIEW.md with human feedback (blockers, suggestions)
4. \`insight-flow review-end --id Nxx --verdict approved|fix-needed --type human --comment "..."\`
5. Call /task-git to push

$ARGUMENTS
`;

const SKILL_GIT = `ROLE: insight-flow Git Agent

You handle git operations: branch, commit, push, PR, merge. Use conventional commits.

INPUT: Task ID (optional) + intent (push, create PR, merge).

PUSH WORKFLOW:
1. \`insight-flow current\` if no ID
2. Create/checkout branch: <type>/<task-id>-<slug>
3. Stage relevant files + workTasks/*.json
4. Commit with conventional message
5. \`git push -u origin HEAD\`
6. \`insight-flow push --id Nxx --commit <hash> --message "..." --branch <branch>\`

$ARGUMENTS
`;

const SKILL_INCIDENT = `ROLE: insight-flow Incident Tracker

You track production incidents against existing tasks.

INPUT: Task ID + incident details.

WORKFLOW:
1. \`insight-flow incident-create --id Nxx --title "..." --severity critical|high|medium|low\`
2. Create incident branch: fix/incident/Nxx-slug
3. Fix the incident
4. \`insight-flow incident-resolve --id Nxx --incident INC-001 --rootCause "..." --fix "..."\`
5. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REQUEST_CHANGES = `ROLE: insight-flow Change Requester

You record post-implementation change requests on a task.

INPUT: Task ID (optional) + description of changes needed.

WORKFLOW:
1. \`insight-flow current\` if no ID
2. \`insight-flow change-request --id Nxx --description "..."\`
3. Optionally implement: \`insight-flow change-start\` / \`insight-flow change-end\`
4. Call /task-git to push

$ARGUMENTS
`;

const SKILL_TASKMASTER_CHANGE = `ROLE: insight-flow Taskmaster Change Agent

You modify an existing task's spec (TASK.md and/or CHECKLIST.md) based on user input.

INPUT: Task ID (optional) + description of what to change.

WORKFLOW:
1. \`insight-flow current\` if no ID
2. Read TASK.md + CHECKLIST.md from the task folder
3. Apply requested changes to the spec
4. Call /task-git to push updated docs

$ARGUMENTS
`;

function generateActivityHook(cwd: string, config: TaskflowConfig): void {
  const logFile = config.activityEngine?.logFile || ".taskflow-activity.jsonl";

  // 1. Create hook script
  const hooksDir = resolve(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookScript = ACTIVITY_HOOK_SCRIPT.replace("__LOG_FILE__", logFile);
  const hookPath = resolve(hooksDir, "taskflow-activity.sh");
  writeFileSync(hookPath, hookScript, { mode: 0o755 });

  // 2. Update .claude/settings.local.json with hook config
  const settingsPath = resolve(cwd, ".claude", "settings.local.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // If malformed, start fresh
    }
  }

  // Merge hooks — don't overwrite existing ones
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const postToolUse = (hooks.PostToolUse ?? []) as Array<Record<string, unknown>>;

  // Check if our hook already exists
  const hookExists = postToolUse.some(
    (h) =>
      typeof h === "object" &&
      h !== null &&
      ((h.command as string) || "").includes("taskflow-activity.sh"),
  );

  if (!hookExists) {
    postToolUse.push({
      command: ".claude/hooks/taskflow-activity.sh",
      timeout: 5000,
    });
    hooks.PostToolUse = postToolUse;
    settings.hooks = hooks;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    console.log("Generated activity hook in .claude/hooks/ and registered in settings.local.json");
  } else {
    console.log("Activity hook already registered, skipping.");
  }
}

const ACTIVITY_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Activity Hook — appends Claude Code tool events to activity log
# This runs automatically on PostToolUse — zero token cost to Claude.
LOG_FILE="__LOG_FILE__"

# Read the hook event JSON from stdin
INPUT=$(cat)

# Extract tool name and file path using lightweight parsing
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$FILE" ]; then
  FILE=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Skip if no tool name captured
[ -z "$TOOL" ] && exit 0

# Append JSONL line
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
if [ -n "$FILE" ]; then
  echo "{\\"ts\\":\\"$TS\\",\\"tool\\":\\"$TOOL\\",\\"action\\":\\"use\\",\\"file\\":\\"$FILE\\"}" >> "$LOG_FILE"
else
  echo "{\\"ts\\":\\"$TS\\",\\"tool\\":\\"$TOOL\\",\\"action\\":\\"use\\"}" >> "$LOG_FILE"
fi
`;

function inferName(cwd: string): string {
  try {
    const pkgPath = resolve(cwd, "package.json");
    if (existsSync(pkgPath)) {
      const { name } = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (name) return name;
    }
  } catch {
    // ignore
  }
  return resolve(cwd).split("/").pop() || "project";
}
