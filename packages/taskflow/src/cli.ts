import { existsSync, readFileSync } from "node:fs";
import { resolveConfig, getMasterPath } from "./config.js";
import { loadMaster } from "./storage.js";
import { resolvePackageAsset, TaskflowProjectNotFoundError } from "./paths.js";
import { TaskflowValidationError } from "./schema/index.js";
import { initProject } from "./init/index.js";
import { startServer } from "./server/index.js";
import { cmdCreate } from "./commands/create.js";
import { cmdStatus } from "./commands/status.js";
import { cmdImplementStart, cmdImplementEnd } from "./commands/implement.js";
import { cmdReviewStart, cmdReviewEnd } from "./commands/review.js";
import { cmdFixStart, cmdFixEnd } from "./commands/fix.js";
import { cmdPush, cmdMrUpdate, cmdMerge, cmdDone } from "./commands/push.js";
import {
  cmdCurrent,
  cmdList,
  cmdStats,
  cmdNext,
  cmdNextReview,
  cmdNextFix,
} from "./commands/query.js";
import {
  cmdChangeRequest,
  cmdChangeStart,
  cmdChangeEnd,
  cmdNextChange,
} from "./commands/change.js";
import {
  cmdIncidentCreate,
  cmdIncidentStatus,
  cmdIncidentResolve,
  cmdIncidentList,
} from "./commands/incident.js";
import { cmdMigrate, cmdMigrateReviews } from "./commands/migrate.js";
import { cmdPromptBuild } from "./commands/prompt-build.js";
import { cmdShow } from "./commands/show.js";
import { cmdBatchUi, cmdBatchUiAdd, cmdBatchUiList, cmdBatchUiRemove, cmdUiBatchRegister, cmdUiBatchUnregister, cmdUiBatchDown } from "./commands/batch-ui.js";
import { cmdInstallActivityHook } from "./commands/install-activity-hook.js";
import { cmdInstallLifecycleHooks } from "./commands/install-lifecycle-hooks.js";
import { cmdNotify } from "./commands/notify.js";
import { cmdLogActivity } from "./commands/log-activity.js";
import { cmdLogEvent } from "./commands/log-event.js";
import type { ParsedArgs } from "./types.js";

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
      } else {
        parsed[key] = next;
        i++;
      }
    } else {
      (parsed._ as string[]).push(args[i]);
    }
  }
  return parsed;
}

function printHelp(): void {
  console.log(`
  insight-flow — Workbench for AI task workflows

  USAGE
    insight-flow                          Launch dashboard (dev server)
    insight-flow <command> [options]      Run a task command

  COMMANDS
    init [--force] [--examples]           Initialize insight-flow in current project (--force overwrites existing role files; --examples adds commented agents.extend stubs)
    ui [--port 6006]                      Launch dashboard server

    create --title "..." [--type feat] [--priority high] [--tags a,b]
    status --id Nxx --status <status> [--by agent]
    list [--status ready]
    current
    show --id Nxx [--summary] [--spec]   Print task JSON; --summary returns lean fields, --spec includes TASK.md + CHECKLIST.md content
    stats [--tokens]                     Aggregate stats; --tokens reports tokensUsed trends per type/priority
    next [--with-spec]                   Pick next actionable task; --with-spec inlines TASK.md + CHECKLIST.md in the response
    next-review [--with-spec]            Pick next reviewable task; --with-spec as above
    next-fix [--with-spec]               Pick next fix-needed task; --with-spec as above
    next-change

    implement-start --id Nxx
    implement-end --id Nxx --files "a.ts,b.ts"

    review-start --id Nxx [--type ai|human] [--by reviewer]
    review-end --id Nxx --verdict approved|fix-needed [--comment "..."]

    fix-start --id Nxx
    fix-end --id Nxx --files "a.ts" [--comment "..."]

    push --id Nxx --commit abc123 --message "..." [--branch name]
    mr-update --id Nxx --url "https://..."
    merge --id Nxx
    done --id Nxx

    change-request --id Nxx --description "..."
    change-start --id Nxx
    change-end --id Nxx --files "a.ts" [--comment "..."]

    incident-create --id Nxx --title "..." --severity critical
    incident-status --id Nxx --incident INC-001 --status investigating
    incident-resolve --id Nxx --incident INC-001 --rootCause "..." --fix "..."
    incident-list [--id Nxx]

    migrate                               Migrate from legacy tracker.json
    migrate-reviews                       Split inline reviews/incidents into per-task side files (run once after upgrade)
    prompt-build [--apply]                Print or apply enforcement block from taskflow.config.json
    install-activity-hook [--force]       Install the Claude Code PostToolUse hook so the activity panel receives events (idempotent; refuses when activityEngine.enabled is false unless --force)
    install-lifecycle-hooks [--bin <path>] Install lifecycle event hooks (SessionStart, UserPromptSubmit, Stop, PreToolUse, PostToolUse, PermissionRequest) into .claude/settings.json (idempotent)
    notify "<message>" [--title <t>] [--project <p>]   Fire an OS notification (fire-and-forget; respects notifications.cli)
    log-activity "<message>"                            Emit free-form narrative to the activity feed (no-op when activityEngine.enabled is false)
    log-event <type> [--task Nxx] [--data <json>]       Emit a typed lifecycle event (mandatory: start|done; optional: active|idle|edit-start|edit-end|research-start|research-end|review-start|review-end|git-start|git-end)

    ui-batch-register                     Register this folder as a batch-ui project (reads taskflow.config.json)
    ui-batch-unregister                   Unregister this folder from batch-ui (mirror of ui-batch-register)
    ui-batch-down                         Stop all servers started by the last batch-ui run
    batch-ui [--no-open]                  Launch dashboards for multiple projects (interactive multi-select)
    batch-ui --add "<label>" <path>       Register a project by explicit path
    batch-ui --remove "<label>"           Remove a registered project by label
    batch-ui --list                       List all registered batch-ui projects

    help                                  Show this help
    version                               Show version
`);
}

const args = process.argv.slice(2);
const command = args[0];
const opts = parseArgs(args.slice(1));

async function run(): Promise<void> {
  // Commands that don't need master.json
  if (!command || command === "ui") {
    const config = resolveConfig();
    const port = opts.port ? parseInt(opts.port as string, 10) : undefined;
    startServer(config, port);
  } else if (command === "init") {
    const yesFlag = !!(opts.yes || opts.y) || (opts._ as string[]).includes("-y");
    await initProject(process.cwd(), !!opts.force, { examples: !!opts.examples, yes: yesFlag });
  } else if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
  } else if (command === "version" || command === "--version" || command === "-v") {
    const pkgPath = resolvePackageAsset("package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
    console.log(`insight-flow ${pkg.version}`);
  } else if (command === "migrate") {
    const config = resolveConfig();
    cmdMigrate(config);
  } else if (command === "migrate-reviews") {
    const config = resolveConfig();
    cmdMigrateReviews(config);
  } else if (command === "prompt-build") {
    const config = resolveConfig();
    cmdPromptBuild(config, opts);
  } else if (command === "install-activity-hook") {
    const config = resolveConfig();
    cmdInstallActivityHook(config, opts);
  } else if (command === "install-lifecycle-hooks") {
    cmdInstallLifecycleHooks(opts);
  } else if (command === "notify") {
    const config = resolveConfig();
    cmdNotify(config, opts);
  } else if (command === "log-activity") {
    const config = resolveConfig();
    cmdLogActivity(config, opts);
  } else if (command === "log-event") {
    const config = resolveConfig();
    cmdLogEvent(config, opts);
  } else if (command === "ui-batch-register") {
    cmdUiBatchRegister();
  } else if (command === "ui-batch-unregister") {
    cmdUiBatchUnregister();
  } else if (command === "ui-batch-down") {
    cmdUiBatchDown();
  } else if (command === "batch-ui") {
    if (opts.list) {
      cmdBatchUiList();
    } else if (opts.add) {
      cmdBatchUiAdd(opts);
    } else if (opts.remove) {
      cmdBatchUiRemove(opts);
    } else {
      await cmdBatchUi(opts);
    }
  } else {
    // All other commands need master.json
    const config = resolveConfig();
    const masterPath = getMasterPath(config);

    if (!existsSync(masterPath)) {
      console.error("No insight-flow project found. Run 'insight-flow init' first.");
      process.exit(1);
    }

    const master = loadMaster(config);

    switch (command) {
      case "create":
        cmdCreate(config, master, opts);
        break;
      case "status":
        cmdStatus(config, master, opts);
        break;
      case "implement-start":
        cmdImplementStart(config, master, opts);
        break;
      case "implement-end":
        cmdImplementEnd(config, master, opts);
        break;
      case "review-start":
        cmdReviewStart(config, master, opts);
        break;
      case "review-end":
        cmdReviewEnd(config, master, opts);
        break;
      case "fix-start":
        cmdFixStart(config, master, opts);
        break;
      case "fix-end":
        cmdFixEnd(config, master, opts);
        break;
      case "push":
        cmdPush(config, master, opts);
        break;
      case "mr-update":
        cmdMrUpdate(config, master, opts);
        break;
      case "merge":
        cmdMerge(config, master, opts);
        break;
      case "done":
        cmdDone(config, master, opts);
        break;
      case "current":
        cmdCurrent(config, master);
        break;
      case "show":
        cmdShow(config, master, opts);
        break;
      case "list":
        cmdList(config, master, opts);
        break;
      case "stats":
        cmdStats(config, master, opts);
        break;
      case "next":
        cmdNext(config, master, opts);
        break;
      case "next-review":
        cmdNextReview(config, master, opts);
        break;
      case "next-fix":
        cmdNextFix(config, master, opts);
        break;
      case "change-request":
        cmdChangeRequest(config, master, opts);
        break;
      case "change-start":
        cmdChangeStart(config, master, opts);
        break;
      case "change-end":
        cmdChangeEnd(config, master, opts);
        break;
      case "next-change":
        cmdNextChange(config, master);
        break;
      case "incident-create":
        cmdIncidentCreate(config, master, opts);
        break;
      case "incident-status":
        cmdIncidentStatus(config, master, opts);
        break;
      case "incident-resolve":
        cmdIncidentResolve(config, master, opts);
        break;
      case "incident-list":
        cmdIncidentList(config, master, opts);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'insight-flow help' for usage.");
        process.exit(1);
    }
  }
}

run().catch((err) => {
  if (err instanceof TaskflowValidationError || err instanceof TaskflowProjectNotFoundError) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  throw err;
});
