import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export class TaskflowProjectNotFoundError extends Error {
  constructor(searchedFrom: string) {
    super(
      `no insight-flow project found (searched upward from ${searchedFrom}). ` +
        `Run 'insight-flow init' to create one.`,
    );
    this.name = "TaskflowProjectNotFoundError";
  }
}

const CONFIG_FILENAME = "taskflow.config.json";
export const DEFAULT_WORK_DIR = "workTasks";
const MASTER_FILENAME = "master.json";
const INSIGHT_FLOW_DIRNAME = "insightFlow";
const EVENTS_DIRNAME = "events";
const LEGACY_EVENTS_DIRNAME = ".events";

export interface FlowRoot {
  /** `<project>/insightFlow` on the new layout, the project dir itself on legacy. */
  root: string;
  /** Where master.json + shards + task folders live. */
  tasksDir: string;
  /** Daily JSONL event backups: `<root>/events` (new) or `<tasksDir>/.events` (legacy). */
  eventsDir: string;
  layout: "insightFlow" | "legacy";
}

/**
 * N99: single source of truth for the storage layout. Prefers the consolidated
 * `insightFlow/` root when present, falls back to the legacy `<workDir>` +
 * `.events` layout otherwise. Detection is computed per call — no cache —
 * so a live `migrate-layout` run is picked up immediately.
 */
export function resolveFlowRoot(projectDir: string, workDir: string = DEFAULT_WORK_DIR): FlowRoot {
  const insightRoot = resolve(projectDir, INSIGHT_FLOW_DIRNAME);
  const insightTasksDir = resolve(insightRoot, DEFAULT_WORK_DIR);
  if (existsSync(insightTasksDir)) {
    return {
      root: insightRoot,
      tasksDir: insightTasksDir,
      eventsDir: resolve(insightRoot, EVENTS_DIRNAME),
      layout: "insightFlow",
    };
  }
  const tasksDir = resolve(projectDir, workDir);
  return {
    root: projectDir,
    tasksDir,
    eventsDir: resolve(tasksDir, LEGACY_EVENTS_DIRNAME),
    layout: "legacy",
  };
}

let cachedProjectRoot: string | null = null;

export function resolveProjectRoot(start: string = process.cwd()): string {
  if (cachedProjectRoot && start === process.cwd()) {
    return cachedProjectRoot;
  }

  let dir = resolve(start);
  while (true) {
    if (
      existsSync(resolve(dir, CONFIG_FILENAME)) ||
      existsSync(resolve(dir, DEFAULT_WORK_DIR, MASTER_FILENAME)) ||
      existsSync(resolve(dir, INSIGHT_FLOW_DIRNAME, DEFAULT_WORK_DIR, MASTER_FILENAME))
    ) {
      if (start === process.cwd()) cachedProjectRoot = dir;
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new TaskflowProjectNotFoundError(start);
    }
    dir = parent;
  }
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function resolvePackageAsset(relPath: string): string {
  return resolve(PACKAGE_ROOT, relPath);
}
