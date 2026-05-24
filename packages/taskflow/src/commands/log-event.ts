import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import type { TaskflowConfig, ParsedArgs, TaskEvent, EventsFile } from "../types.js";
import { EVENT_TYPES } from "../types.js";
import { EventsFileSchema } from "../schema/index.js";
import { getWorkDir, getMasterPath } from "../config.js";

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

function loadEvents(eventsPath: string): TaskEvent[] {
  if (!existsSync(eventsPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(eventsPath, "utf-8"));
    const parsed = EventsFileSchema.safeParse(raw);
    return parsed.success ? parsed.data.events : [];
  } catch {
    return [];
  }
}

function appendToActivityLog(config: TaskflowConfig, eventType: string, taskId: string | null): void {
  const activityCfg = config.activityEngine;
  if (activityCfg?.enabled === false) return;
  const logFile = resolve(process.cwd(), activityCfg?.logFile ?? ".taskflow-activity.jsonl");
  try {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      tool: "Event",
      action: eventType,
    };
    if (taskId) entry.taskId = taskId;
    appendFileSync(logFile, JSON.stringify(entry) + "\n");
  } catch {
    // fire-and-forget
  }
}

export function cmdLogEvent(config: TaskflowConfig, opts: ParsedArgs): void {
  const eventType = opts._[0] as string | undefined;

  const isValidType = eventType && (EVENT_TYPES as readonly string[]).includes(eventType);
  if (!isValidType) {
    if (eventType) process.stderr.write(`error: unknown event type "${eventType}"\n`);
    process.stderr.write(`usage: insight-flow log-event <type>\n`);
    process.stderr.write(`mandatory: ${["start", "done"].join(" | ")}\n`);
    process.stderr.write(`optional:  ${EVENT_TYPES.slice(2).join(" | ")}\n`);
    process.exit(1);
  }

  const workDir = getWorkDir(config);
  const masterPath = getMasterPath(config);
  const taskId = (opts.task as string | undefined) ?? getCurrentTaskId(masterPath);

  const taskFolder = taskId ? findTaskFolder(workDir, taskId) : null;
  const eventsPath = taskFolder ? resolve(taskFolder, "events.json") : null;

  // Dedup check
  const dedupWindowMs = ((config.events?.dedupWindowSeconds ?? 60) as number) * 1000;
  if (dedupWindowMs > 0 && eventsPath) {
    const existing = loadEvents(eventsPath);
    const now = Date.now();
    const duplicate = existing.find(
      (e) => e.type === eventType && now - new Date(e.timestamp).getTime() < dedupWindowMs,
    );
    if (duplicate) process.exit(0);
  }

  const ts = new Date().toISOString();
  const event: TaskEvent = {
    type: eventType as (typeof EVENT_TYPES)[number],
    taskId: taskId ?? "",
    timestamp: ts,
    ...(opts.data ? { data: JSON.parse(opts.data as string) as Record<string, unknown> } : {}),
  };

  // Write to per-task events.json
  if (eventsPath && taskFolder) {
    if (!existsSync(taskFolder)) mkdirSync(taskFolder, { recursive: true });
    const existing = loadEvents(eventsPath);
    const eventsFile: EventsFile = { taskId: taskId!, events: [...existing, event] };
    writeFileSync(eventsPath, JSON.stringify(eventsFile, null, 2) + "\n");
  }

  // Append to activity log for live feed
  appendToActivityLog(config, eventType, taskId ?? null);

  // Print to stdout (consumed by hooks / callers)
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
