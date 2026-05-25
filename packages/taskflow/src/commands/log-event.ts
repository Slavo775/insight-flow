import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  appendFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import type {
  TaskflowConfig,
  ParsedArgs,
  TaskEvent,
  EventsFile,
  ClaudeHookEvent,
} from "../types.js";
import { EVENT_TYPES, CLAUDE_HOOK_EVENT_TYPES } from "../types.js";
import { EventsFileSchema } from "../schema/index.js";
import { getWorkDir, getMasterPath } from "../config.js";

const INSIGHT_FLOW_DIR = resolve(homedir(), ".insight-flow");

function findTaskFolder(workDir: string, taskId: string): string | null {
  try {
    const entries = readdirSync(workDir, { withFileTypes: true });
    const dir = entries.find((e) => e.isDirectory() && e.name.startsWith(taskId + "-"));
    return dir ? resolve(workDir, dir.name) : null;
  } catch {
    return null;
  }
}

function getCurrentTaskId(masterPath: string): string | null {
  try {
    const master = JSON.parse(readFileSync(masterPath, "utf-8")) as {
      meta?: { currentTaskId?: string | null };
    };
    return master.meta?.currentTaskId ?? null;
  } catch {
    return null;
  }
}

function loadEvents(eventsPath: string): (TaskEvent | ClaudeHookEvent)[] {
  if (!existsSync(eventsPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(eventsPath, "utf-8"));
    const parsed = EventsFileSchema.safeParse(raw);
    return parsed.success ? (parsed.data.events as (TaskEvent | ClaudeHookEvent)[]) : [];
  } catch {
    return [];
  }
}

function appendToActivityLog(
  config: TaskflowConfig,
  entry: Record<string, unknown>,
): void {
  const activityCfg = config.activityEngine;
  if (activityCfg?.enabled === false) return;
  const logFile = resolve(process.cwd(), activityCfg?.logFile ?? ".taskflow-activity.jsonl");
  try {
    appendFileSync(logFile, JSON.stringify(entry) + "\n");
  } catch {
    // fire-and-forget
  }
}

function getSessionId(opts: ParsedArgs): string | null {
  return (opts["session-id"] as string | undefined) ?? process.env["CLAUDE_SESSION_ID"] ?? null;
}

function getActiveFlagPath(sessionId: string): string {
  return resolve(INSIGHT_FLOW_DIR, `session-${sessionId}.active`);
}

function getSessionLogPath(sessionId: string): string {
  return resolve(INSIGHT_FLOW_DIR, `events-${sessionId}.jsonl`);
}

function isSessionActive(sessionId: string): boolean {
  return existsSync(getActiveFlagPath(sessionId));
}

function writeActivationFlag(sessionId: string): void {
  mkdirSync(INSIGHT_FLOW_DIR, { recursive: true });
  writeFileSync(
    getActiveFlagPath(sessionId),
    JSON.stringify({ sessionId, activatedAt: new Date().toISOString() }),
  );
}

function clearActivationFlag(sessionId: string): void {
  try {
    unlinkSync(getActiveFlagPath(sessionId));
  } catch {
    // ignore
  }
}

function appendToSessionLog(sessionId: string, event: ClaudeHookEvent): void {
  mkdirSync(INSIGHT_FLOW_DIR, { recursive: true });
  appendFileSync(getSessionLogPath(sessionId), JSON.stringify(event) + "\n");
}

export function cmdLogEvent(config: TaskflowConfig, opts: ParsedArgs): void {
  const eventType = opts._[0] as string | undefined;
  const source = (opts.source as string | undefined) ?? "agent";
  const hookName = opts["hook-name"] as string | undefined;
  const ifActive = Boolean(opts["if-active"]);
  const sessionId = getSessionId(opts);

  // --if-active: exit 0 silently if no activation flag for this session
  if (ifActive) {
    if (!sessionId || !isSessionActive(sessionId)) {
      process.exit(0);
    }
  }

  const isHook = source === "hook";
  const validTypes = isHook
    ? (CLAUDE_HOOK_EVENT_TYPES as readonly string[])
    : (EVENT_TYPES as readonly string[]);

  const isValidType = eventType && validTypes.includes(eventType);
  if (!isValidType) {
    if (eventType) process.stderr.write(`error: unknown event type "${eventType}" for source "${source}"\n`);
    process.stderr.write(`usage: insight-flow log-event <type> [--source hook] [--hook-name <name>] [--session-id <id>] [--if-active]\n`);
    if (isHook) {
      process.stderr.write(`hook types: ${CLAUDE_HOOK_EVENT_TYPES.join(" | ")}\n`);
    } else {
      process.stderr.write(`mandatory: ${["start", "done"].join(" | ")}\n`);
      process.stderr.write(`optional:  ${EVENT_TYPES.slice(2).join(" | ")}\n`);
    }
    process.exit(1);
  }

  const workDir = getWorkDir(config);
  const masterPath = getMasterPath(config);
  const taskId = (opts.task as string | undefined) ?? getCurrentTaskId(masterPath);
  const taskFolder = taskId ? findTaskFolder(workDir, taskId) : null;
  const eventsPath = taskFolder ? resolve(taskFolder, "events.json") : null;
  const ts = new Date().toISOString();

  if (isHook) {
    const hookEvent: ClaudeHookEvent = {
      id: `evt_${Date.now()}_${randomBytes(2).toString("hex")}`,
      type: eventType as (typeof CLAUDE_HOOK_EVENT_TYPES)[number],
      source: "hook",
      hookName: hookName ?? "unknown",
      timestamp: ts,
      ...(sessionId ? { sessionId } : {}),
      ...(taskId ? { taskId } : {}),
      payload: opts.data
        ? (JSON.parse(opts.data as string) as Record<string, unknown>)
        : {},
    };

    // Write to session JSONL
    if (sessionId) {
      appendToSessionLog(sessionId, hookEvent);
    }

    // Write to per-task events.json
    if (eventsPath && taskFolder) {
      if (!existsSync(taskFolder)) mkdirSync(taskFolder, { recursive: true });
      const existing = loadEvents(eventsPath);
      const eventsFile: EventsFile = {
        taskId: taskId!,
        events: [...existing, hookEvent],
      };
      writeFileSync(eventsPath, JSON.stringify(eventsFile, null, 2) + "\n");
    }

    // Manage activation flag
    if (sessionId) {
      if (eventType === "agent-active") {
        writeActivationFlag(sessionId);
      } else if (eventType === "agent-idle" || eventType === "session-end") {
        clearActivationFlag(sessionId);
      }
    }

    // Append to activity log
    const activityEntry: Record<string, unknown> = {
      id: `evt_${Date.now()}_${randomBytes(2).toString("hex")}`,
      ts,
      tool: "Event",
      action: hookEvent.type,
      source: "hook",
      hookName: hookEvent.hookName,
    };
    if (taskId) activityEntry.taskId = taskId;
    if (hookEvent.payload["tool_name"]) activityEntry.toolName = hookEvent.payload["tool_name"];
    if (hookEvent.payload["path"]) activityEntry.file = String(hookEvent.payload["path"]);
    if (hookEvent.payload["agent_type"]) activityEntry.agentType = hookEvent.payload["agent_type"];
    if (hookEvent.payload["error_type"]) activityEntry.errorType = hookEvent.payload["error_type"];
    if (hookEvent.payload["prompt"]) {
      activityEntry.promptPreview = String(hookEvent.payload["prompt"]).slice(0, 80);
    }
    if (hookEvent.payload["input_summary"]) {
      activityEntry.inputSummary = String(hookEvent.payload["input_summary"]).slice(0, 80);
    }
    appendToActivityLog(config, activityEntry);

    process.stdout.write(
      JSON.stringify({ event: eventType, source: "hook", taskId: taskId ?? null, ts }) + "\n",
    );
    return;
  }

  // Agent event path (source = "agent")

  // Dedup check
  const dedupWindowMs = ((config.events?.dedupWindowSeconds ?? 60) as number) * 1000;
  if (dedupWindowMs > 0 && eventsPath) {
    const existing = loadEvents(eventsPath);
    const agentEvents = existing.filter(
      (e): e is TaskEvent => (e as TaskEvent).source !== "hook" && !("hookName" in e),
    );
    const now = Date.now();
    const duplicate = agentEvents.find(
      (e) => e.type === eventType && now - new Date(e.timestamp).getTime() < dedupWindowMs,
    );
    if (duplicate) process.exit(0);
  }

  const event: TaskEvent = {
    type: eventType as (typeof EVENT_TYPES)[number],
    taskId: taskId ?? "",
    timestamp: ts,
    source: "agent",
    ...(opts.data ? { data: JSON.parse(opts.data as string) as Record<string, unknown> } : {}),
  };

  // Write to per-task events.json
  if (eventsPath && taskFolder) {
    if (!existsSync(taskFolder)) mkdirSync(taskFolder, { recursive: true });
    const existing = loadEvents(eventsPath);
    const eventsFile: EventsFile = { taskId: taskId!, events: [...existing, event] };
    writeFileSync(eventsPath, JSON.stringify(eventsFile, null, 2) + "\n");
  }

  // Append to activity log
  appendToActivityLog(config, {
    id: `evt_${Date.now()}_${randomBytes(2).toString("hex")}`,
    ts,
    tool: "Event",
    action: eventType,
    source: "agent",
    ...(taskId ? { taskId } : {}),
  });

  // Print to stdout
  process.stdout.write(JSON.stringify({ event: eventType, taskId: taskId ?? null, ts }) + "\n");

  // Fire configured hooks (detached, fire-and-forget)
  const hooks = config.events?.hooks?.[eventType as (typeof EVENT_TYPES)[number]];
  if (hooks?.length) {
    for (const cmd of hooks) {
      try {
        const child = spawn("sh", ["-c", cmd], { detached: true, stdio: "ignore" });
        child.unref();
      } catch {
        // fire-and-forget
      }
    }
  }
}
