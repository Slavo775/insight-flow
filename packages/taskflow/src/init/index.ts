import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TaskflowConfig } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function initProject(cwd: string = process.cwd()): void {
  const configPath = resolve(cwd, "taskflow.config.json");

  // 1. Write config
  const config: TaskflowConfig = {
    workDir: "workTasks",
    shardSize: 10,
    projectName: inferName(cwd),
    rolesDir: ".claude/roles",
    server: { port: 6006 },
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

  // 3. Copy role templates
  const rolesDir = resolve(cwd, config.rolesDir);
  const templateRolesDir = resolve(__dirname, "..", "templates", "roles");

  if (existsSync(templateRolesDir)) {
    if (!existsSync(rolesDir)) {
      mkdirSync(rolesDir, { recursive: true });
    }
    try {
      cpSync(templateRolesDir, rolesDir, { recursive: true, force: false });
      console.log(`Copied role templates to ${config.rolesDir}/`);
    } catch {
      console.log("Role templates already exist, skipping.");
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
    console.log("Created CLAUDE.md with taskflow context");
  } else {
    const existing = readFileSync(claudeMdPath, "utf-8");
    if (existing.includes(MARKER)) {
      // Replace existing taskflow section
      const before = existing.substring(0, existing.indexOf(MARKER));
      const afterIdx = existing.indexOf(MARKER_END);
      const after = afterIdx >= 0 ? existing.substring(afterIdx + MARKER_END.length) : "";
      writeFileSync(claudeMdPath, before + MARKER + "\n" + taskflowSection + MARKER_END + after);
      console.log("Updated taskflow section in existing CLAUDE.md");
    } else {
      // Append taskflow section
      writeFileSync(claudeMdPath, existing.trimEnd() + "\n\n" + MARKER + "\n" + taskflowSection + MARKER_END + "\n");
      console.log("Appended taskflow section to existing CLAUDE.md");
    }
  }

  console.log("\nTaskflow initialized! Run 'taskflow create --title \"My task\" --type feat' to create your first task.");
  console.log("Run 'taskflow' to launch the dashboard.\n");
}

function generateClaudeMd(config: TaskflowConfig): string {
  return `# CLAUDE.md

This project uses **taskflow** for AI-assisted task lifecycle management.

## Task System

Tasks are tracked in \`${config.workDir}/\` as sharded JSON files. Use the taskflow CLI or slash commands to manage them.

## Commands

\`\`\`bash
taskflow create --title "..." --type feat|fix|rework --priority high|medium|low --tags a,b
taskflow current                    # Show active task
taskflow list                       # List all tasks
taskflow stats                      # Aggregate statistics
taskflow next                       # Pick next actionable task
taskflow                            # Launch dashboard at http://localhost:${config.server.port}
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
- Tracker commands: \`taskflow <command>\` (replaces \`node scripts/task-tracker.mjs\`)
`;
}

const SKILL_TASKMASTER = `ROLE: Taskflow Taskmaster (Work Item Generator)

You generate well-structured work items (bugs, features, rework). Each task gets a unique Nxx ID and lives in the workTasks directory.

INPUT: Human provides task type (fix/feat/rework), scope description, optional priority.
Run \`taskflow current\` to see the current state.

OUTPUT:
1. Run: \`taskflow create --title "..." --type fix|feat|rework --priority high|medium|low --tags tag1,tag2\`
2. Write TASK.md + CHECKLIST.md in the created folder.
3. Call /task-git to push task documents.

$ARGUMENTS
`;

const SKILL_IMPLEMENT = `ROLE: Taskflow Task Implementer

You implement work items from workTasks/ specifications. Follow the spec exactly.

INPUT: Task ID or run \`taskflow next\` to pick the next task.

WORKFLOW:
1. \`taskflow next\` or use provided ID
2. \`taskflow implement-start --id Nxx\`
3. Read TASK.md + CHECKLIST.md from the task folder
4. Implement the plan, run quality gates
5. \`taskflow implement-end --id Nxx --files "file1.ts,file2.ts"\`
6. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REVIEW = `ROLE: Taskflow Task Reviewer

You perform AI code review on implemented tasks.

INPUT: Task ID or run \`taskflow next-review\` to pick the next reviewable task.

WORKFLOW:
1. \`taskflow next-review\` or use provided ID
2. \`taskflow review-start --id Nxx --type ai --by task-review\`
3. Read TASK.md, CHECKLIST.md, and all changed files
4. Review against checklist, check quality gates
5. \`taskflow review-end --id Nxx --verdict approved|fix-needed --comment "..."\`
6. If fix-needed, write REVIEW.md with findings
7. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REVIEW_FIX = `ROLE: Taskflow Review Fixer

You fix issues identified during code review.

INPUT: Task ID or run \`taskflow next-fix\`.

WORKFLOW:
1. \`taskflow next-fix\` or use provided ID
2. \`taskflow fix-start --id Nxx\`
3. Read REVIEW.md for blockers
4. Fix each blocker, run quality gates
5. \`taskflow fix-end --id Nxx --files "..." --comment "..."\`
6. Call /task-git to push

$ARGUMENTS
`;

const SKILL_HUMAN_REVIEW = `ROLE: Taskflow Human Review Recorder

You record the human's review feedback on a task.

INPUT: Task ID (optional) + human's review comments.

WORKFLOW:
1. \`taskflow current\` if no ID given
2. \`taskflow review-start --id Nxx --type human --by task-human-review\`
3. Write/update REVIEW.md with human feedback (blockers, suggestions)
4. \`taskflow review-end --id Nxx --verdict approved|fix-needed --type human --comment "..."\`
5. Call /task-git to push

$ARGUMENTS
`;

const SKILL_GIT = `ROLE: Taskflow Git Agent

You handle git operations: branch, commit, push, PR, merge. Use conventional commits.

INPUT: Task ID (optional) + intent (push, create PR, merge).

PUSH WORKFLOW:
1. \`taskflow current\` if no ID
2. Create/checkout branch: <type>/<task-id>-<slug>
3. Stage relevant files + workTasks/*.json
4. Commit with conventional message
5. \`git push -u origin HEAD\`
6. \`taskflow push --id Nxx --commit <hash> --message "..." --branch <branch>\`

$ARGUMENTS
`;

const SKILL_INCIDENT = `ROLE: Taskflow Incident Tracker

You track production incidents against existing tasks.

INPUT: Task ID + incident details.

WORKFLOW:
1. \`taskflow incident-create --id Nxx --title "..." --severity critical|high|medium|low\`
2. Create incident branch: fix/incident/Nxx-slug
3. Fix the incident
4. \`taskflow incident-resolve --id Nxx --incident INC-001 --rootCause "..." --fix "..."\`
5. Call /task-git to push

$ARGUMENTS
`;

const SKILL_REQUEST_CHANGES = `ROLE: Taskflow Change Requester

You record post-implementation change requests on a task.

INPUT: Task ID (optional) + description of changes needed.

WORKFLOW:
1. \`taskflow current\` if no ID
2. \`taskflow change-request --id Nxx --description "..."\`
3. Optionally implement: \`taskflow change-start\` / \`taskflow change-end\`
4. Call /task-git to push

$ARGUMENTS
`;

const SKILL_TASKMASTER_CHANGE = `ROLE: Taskflow Taskmaster Change Agent

You modify an existing task's spec (TASK.md and/or CHECKLIST.md) based on user input.

INPUT: Task ID (optional) + description of what to change.

WORKFLOW:
1. \`taskflow current\` if no ID
2. Read TASK.md + CHECKLIST.md from the task folder
3. Apply requested changes to the spec
4. Call /task-git to push updated docs

$ARGUMENTS
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
