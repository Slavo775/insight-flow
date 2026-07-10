import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import type {
  BatchUiEntry,
  BatchUiRunningProcess,
  BatchUiRegistry,
  HubProjectEntry,
} from "./types.js";
import { HubProjectEntrySchema } from "./schema/index.js";

export function getGlobalConfigDir(): string {
  // INSIGHT_FLOW_CONFIG_DIR overrides the default ~/.insight-flow location
  // (used by tests for isolation; also a power-user hook). Note: this only
  // redirects the files owned by this module (hub.json / batch-ui.json), not the
  // master lock/config which resolve `~/.insight-flow` via homedir() directly.
  return process.env.INSIGHT_FLOW_CONFIG_DIR || join(homedir(), ".insight-flow");
}

// ── N213: the persistent master-hub registry (~/.insight-flow/hub.json) ──────

/** First dashboard port the hub assigns from; matches bulk-ui's base. */
const HUB_PORT_BASE = 6007;

function getHubRegistryPath(): string {
  return join(getGlobalConfigDir(), "hub.json");
}

/** Read the persisted hub projects. Missing/unreadable file → empty list; a
 *  single malformed entry is dropped rather than discarding the whole list. */
export function readHubRegistry(): HubProjectEntry[] {
  const p = getHubRegistryPath();
  if (!existsSync(p)) return [];
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as { projects?: unknown };
    const list = Array.isArray(raw.projects) ? raw.projects : [];
    return list.flatMap((e) => {
      const parsed = HubProjectEntrySchema.safeParse(e);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export function writeHubRegistry(projects: HubProjectEntry[]): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getHubRegistryPath(), JSON.stringify({ projects }, null, 2), "utf-8");
}

export function findHubProjectByPath(path: string): HubProjectEntry | undefined {
  return readHubRegistry().find((e) => e.path === path);
}

/**
 * Lowest port at/above the base not already claimed **in the hub registry**.
 * This is a stable, persisted assignment for predictability — it does not probe
 * whether the OS port is currently free; launch-time free-port finding stays the
 * launcher's job (bulk-ui / N215).
 */
export function assignHubPort(existing: HubProjectEntry[] = readHubRegistry()): number {
  const taken = new Set(existing.map((e) => e.port));
  let port = HUB_PORT_BASE;
  while (taken.has(port)) port += 1;
  return port;
}

/**
 * Add (or update-by-path) a project in the hub registry. Idempotent on `path`:
 * an existing entry keeps its `id`/`port`/`registeredAt` and refreshes `label`.
 */
export function upsertHubProject(entry: HubProjectEntry): HubProjectEntry {
  const projects = readHubRegistry();
  const idx = projects.findIndex((e) => e.path === entry.path);
  if (idx >= 0) {
    projects[idx] = { ...projects[idx], label: entry.label, bulkRegistered: entry.bulkRegistered };
    writeHubRegistry(projects);
    return projects[idx];
  }
  projects.push(entry);
  writeHubRegistry(projects);
  return entry;
}

/**
 * Fold any legacy `batch-ui.json` entries into the hub registry (by path),
 * assigning each a free port. Idempotent: re-running adds nothing new. Returns
 * the merged hub list. This is the single-source-of-truth reconciliation (N213).
 */
export function migrateBatchUiIntoHub(): HubProjectEntry[] {
  const projects = readHubRegistry();
  const known = new Set(projects.map((e) => e.path));
  let changed = false;
  for (const b of readBatchUiRegistry()) {
    if (known.has(b.path)) continue;
    projects.push({
      id: randomUUID(),
      label: b.label,
      path: b.path,
      port: assignHubPort(projects),
      bulkRegistered: true,
      registeredAt: new Date().toISOString(),
    });
    known.add(b.path);
    changed = true;
  }
  if (changed) writeHubRegistry(projects);
  return projects;
}

function getRegistryPath(): string {
  return join(getGlobalConfigDir(), "batch-ui.json");
}

function readRaw(): BatchUiRegistry {
  const p = getRegistryPath();
  if (!existsSync(p)) return { entries: [], lastSelected: [], runningPids: [] };
  try {
    const parsed = JSON.parse(readFileSync(p, "utf-8")) as Partial<BatchUiRegistry>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      lastSelected: Array.isArray(parsed.lastSelected) ? parsed.lastSelected : [],
      runningPids: Array.isArray(parsed.runningPids) ? parsed.runningPids : [],
    };
  } catch {
    return { entries: [], lastSelected: [], runningPids: [] };
  }
}

function writeRaw(reg: BatchUiRegistry): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2), "utf-8");
}

export function readBatchUiRegistry(): BatchUiEntry[] {
  return readRaw().entries;
}

export function writeBatchUiRegistry(entries: BatchUiEntry[]): void {
  const reg = readRaw();
  reg.entries = entries;
  writeRaw(reg);
}

export function readBatchUiLastSelected(): string[] {
  return readRaw().lastSelected;
}

export function writeBatchUiLastSelected(labels: string[]): void {
  const reg = readRaw();
  reg.lastSelected = labels;
  writeRaw(reg);
}

export function readBatchUiRunningPids(): BatchUiRunningProcess[] {
  return readRaw().runningPids;
}

export function writeBatchUiRunningPids(pids: BatchUiRunningProcess[]): void {
  const reg = readRaw();
  reg.runningPids = pids;
  writeRaw(reg);
}
