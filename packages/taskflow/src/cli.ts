import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfig, getMasterPath } from "./config.js";
import { loadMaster } from "./storage.js";
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
import { cmdMigrate } from "./commands/migrate.js";
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
    init                                  Initialize insight-flow in current project
    ui [--port 6006]                      Launch dashboard server

    create --title "..." [--type feat] [--priority high] [--tags a,b]
    status --id Nxx --status <status> [--by agent]
    list [--status ready]
    current
    stats
    next
    next-review
    next-fix
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

    help                                  Show this help
    version                               Show version
`);
}

const args = process.argv.slice(2);
const command = args[0];
const opts = parseArgs(args.slice(1));

// Commands that don't need master.json
if (!command || command === "ui") {
  const config = resolveConfig();
  const port = opts.port ? parseInt(opts.port as string, 10) : undefined;
  startServer(config, port);
} else if (command === "init") {
  initProject();
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "version" || command === "--version" || command === "-v") {
  const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  console.log(`insight-flow ${pkg.version}`);
} else if (command === "migrate") {
  const config = resolveConfig();
  cmdMigrate(config);
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
    case "list":
      cmdList(config, master, opts);
      break;
    case "stats":
      cmdStats(config, master);
      break;
    case "next":
      cmdNext(config, master);
      break;
    case "next-review":
      cmdNextReview(config, master);
      break;
    case "next-fix":
      cmdNextFix(config, master);
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
