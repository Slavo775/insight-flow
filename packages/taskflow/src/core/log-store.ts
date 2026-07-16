import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getGlobalConfigDir } from "./global-config.js";
import { LOG_TYPES, type StoredLog } from "./schema/index.js";

/**
 * N242 — the debug log store. Per-project folders under
 * `~/.insight-flow/logs/<slug>/`, one JSON file per level
 * (`error.json` / `warning.json` / `info.json`), plus a `master/` folder for the
 * master's own logs. Append-only, with a THROTTLED trim that keeps at most
 * MAX_LOGS per file. The trim runs at most once per file per TRIM_THROTTLE_MS —
 * a throttle, NOT a debounce, so continuous logging can't starve it and the file
 * is bounded to (MAX_LOGS + one throttle window's worth). Every fs call is
 * guarded: a logging engine must never crash the server it logs for.
 */

const MAX_LOGS = 1000;
const TRIM_THROTTLE_MS = 5 * 60_000;

function logsRoot(): string {
  return join(getGlobalConfigDir(), "logs");
}

/** Filesystem-safe, readable folder name from a project name (not a hash). */
export function slugProject(project: string): string {
  const s = project
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    // N242 review-fix — strip leading/trailing dots AND dashes so a name can't
    // resolve to "." / ".." (a path escape: `join(logsRoot(), "..")` = the parent
    // config dir). "/" is already sanitized to "-", so no deeper chaining exists.
    .replace(/^[.-]+|[.-]+$/g, "");
  return s || "unknown";
}

function projectDir(project: string): string {
  return join(logsRoot(), slugProject(project));
}
function logFile(project: string, type: string): string {
  return join(projectDir(project), `${type}.json`);
}

function readFileLogs(file: string): StoredLog[] {
  try {
    if (!existsSync(file)) return [];
    const arr: unknown = JSON.parse(readFileSync(file, "utf-8"));
    return Array.isArray(arr) ? (arr as StoredLog[]) : [];
  } catch {
    return [];
  }
}

// Per-file last-trim timestamp (in-memory; resets on process restart, which is
// fine — worst case one extra trim after a restart).
const lastTrimAt = new Map<string, number>();

/** Append one enriched log entry; throttled-trim to MAX_LOGS. Never throws. */
export function appendLog(entry: StoredLog): void {
  try {
    const dir = projectDir(entry.projectName);
    mkdirSync(dir, { recursive: true });
    const file = logFile(entry.projectName, entry.type);
    const logs = readFileLogs(file);
    logs.push(entry);
    let out = logs;
    if (logs.length > MAX_LOGS) {
      const now = Date.now();
      if (now - (lastTrimAt.get(file) ?? 0) > TRIM_THROTTLE_MS) {
        out = logs.slice(-MAX_LOGS);
        lastTrimAt.set(file, now);
      }
    }
    writeFileSync(file, JSON.stringify(out));
  } catch {
    /* never let a log write crash the caller */
  }
}

/** All logs for one project + level (as stored, unsorted). */
export function readLogs(project: string, type: string): StoredLog[] {
  return readFileLogs(logFile(project, type));
}

/** Delete a project's entire log folder ("clear"). */
export function clearLogs(project: string): void {
  try {
    rmSync(projectDir(project), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** Folder (slug) names of every project that has logs, incl. `master`. */
export function listProjects(): string[] {
  try {
    if (!existsSync(logsRoot())) return [];
    return readdirSync(logsRoot(), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Read merged logs, newest-first. `project`: a project name, `"master"`, or
 * `"all"`/undefined (every folder). `type`: one level or undefined (all levels).
 */
export function readMerged(opts: { project?: string; type?: string } = {}): StoredLog[] {
  const projects = opts.project && opts.project !== "all" ? [opts.project] : listProjects();
  const types = opts.type ? [opts.type] : [...LOG_TYPES];
  const all: StoredLog[] = [];
  for (const p of projects) {
    for (const t of types) all.push(...readFileLogs(logFile(p, t)));
  }
  // ISO timestamps sort lexicographically; newest first.
  all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
  return all;
}
