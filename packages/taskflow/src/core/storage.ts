import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Incident,
  IncidentsFile,
  MasterFile,
  Review,
  ReviewsFile,
  ShardFile,
  Task,
  TaskflowConfig,
} from "./types.js";
import { getWorkDir, getMasterPath } from "./config.js";
import {
  IncidentsFileSchema,
  MasterFileSchema,
  ReviewsFileSchema,
  ShardFileSchema,
  TaskflowValidationError,
} from "./schema/index.js";
export { getWorkDir, getMasterPath };

export function getShardFileName(taskNum: number, shardSize: number = 10): string {
  const base = Math.floor(taskNum / shardSize) * shardSize;
  const end = base + shardSize - 1;
  return `tasks-N${String(base).padStart(2, "0")}-N${String(end).padStart(2, "0")}.json`;
}

export function getShardPath(workDir: string, shardFile: string): string {
  return resolve(workDir, shardFile);
}

export function loadMaster(config: TaskflowConfig, cwd?: string): MasterFile {
  const masterPath = getMasterPath(config, cwd);
  if (!existsSync(masterPath)) {
    throw new Error(`master.json not found at ${masterPath}. Run 'taskflow init' to initialize.`);
  }
  const raw = JSON.parse(readFileSync(masterPath, "utf-8"));
  const parsed = MasterFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TaskflowValidationError(masterPath, parsed.error);
  }
  return parsed.data as MasterFile;
}

export function saveMaster(config: TaskflowConfig, master: MasterFile, cwd?: string): void {
  const masterPath = getMasterPath(config, cwd);
  const parsed = MasterFileSchema.safeParse(master);
  if (!parsed.success) {
    throw new TaskflowValidationError(masterPath, parsed.error);
  }
  writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n");
}

export function loadShard(workDir: string, shardFile: string): ShardFile {
  const path = getShardPath(workDir, shardFile);
  if (!existsSync(path)) {
    return { range: { from: 0, to: 9 }, tasks: [] };
  }
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = ShardFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TaskflowValidationError(path, parsed.error);
  }
  return parsed.data as ShardFile;
}

export function saveShard(workDir: string, shardFile: string, data: ShardFile): void {
  const path = getShardPath(workDir, shardFile);
  const parsed = ShardFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new TaskflowValidationError(path, parsed.error);
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function parseTaskNum(id: string): number {
  return parseInt(id.replace(/^N/, ""), 10);
}

export function loadTaskById(
  config: TaskflowConfig,
  master: MasterFile,
  id: string,
  cwd?: string,
): { task: Task; shard: ShardFile; shardFile: string } {
  const workDir = getWorkDir(config, cwd);
  const num = parseTaskNum(id);
  const shardFile = getShardFileName(num, config.shardSize);
  const shard = loadShard(workDir, shardFile);
  const task = shard.tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error(`Task ${id} not found in ${shardFile}`);
  }
  return { task, shard, shardFile };
}

export function loadAllTasks(config: TaskflowConfig, master: MasterFile, cwd?: string): Task[] {
  const workDir = getWorkDir(config, cwd);
  const all: Task[] = [];
  for (const shardFile of master.meta.shards) {
    const shard = loadShard(workDir, shardFile);
    all.push(...shard.tasks);
  }
  return all;
}

export function ensureShardExists(
  config: TaskflowConfig,
  master: MasterFile,
  shardFile: string,
  taskNum: number,
  cwd?: string,
): void {
  const workDir = getWorkDir(config, cwd);
  if (!master.meta.shards.includes(shardFile)) {
    master.meta.shards.push(shardFile);
    master.meta.shards.sort();
    const base = Math.floor(taskNum / config.shardSize) * config.shardSize;
    saveShard(workDir, shardFile, {
      range: { from: base, to: base + config.shardSize - 1 },
      tasks: [],
    });
  }
}

export function ensureWorkDir(config: TaskflowConfig, cwd?: string): void {
  const workDir = getWorkDir(config, cwd);
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }
}

export function now(): string {
  return new Date().toISOString();
}

export function resolveId(master: MasterFile, id?: string): string {
  const resolved = id || master.meta.currentTaskId;
  if (!resolved) {
    throw new Error("No task ID provided and no current task set.");
  }
  return resolved;
}

/**
 * Resolve `<workDir>/<task folder name>`. Task.folder is stored relative to
 * the project root and its prefix varies by layout era ("workTasks/Nxx-slug",
 * "insightFlow/workTasks/Nxx-slug"); task folders are always direct children
 * of the tasks dir, so the basename against the live workDir is canonical.
 */
function resolveTaskFolder(cwd: string | undefined, config: TaskflowConfig, task: Task): string {
  const workDir = getWorkDir(config, cwd);
  const tail = task.folder.split(/[\\/]/).filter(Boolean).pop() ?? task.folder;
  return resolve(workDir, tail);
}

export function getReviewsPath(config: TaskflowConfig, task: Task, cwd?: string): string {
  return resolve(resolveTaskFolder(cwd, config, task), "reviews.json");
}

export function getIncidentsPath(config: TaskflowConfig, task: Task, cwd?: string): string {
  return resolve(resolveTaskFolder(cwd, config, task), "incidents.json");
}

/** Load reviews for a task from its side file. Returns [] if missing. */
export function loadTaskReviews(config: TaskflowConfig, task: Task, cwd?: string): Review[] {
  const path = getReviewsPath(config, task, cwd);
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = ReviewsFileSchema.safeParse(raw);
  if (!parsed.success) throw new TaskflowValidationError(path, parsed.error);
  return parsed.data.reviews;
}

/** Save reviews for a task to its side file. Creates the file as needed. */
export function saveTaskReviews(
  config: TaskflowConfig,
  task: Task,
  reviews: Review[],
  cwd?: string,
): void {
  const folder = resolveTaskFolder(cwd, config, task);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  const path = getReviewsPath(config, task, cwd);
  const data: ReviewsFile = { taskId: task.id, reviews };
  const parsed = ReviewsFileSchema.safeParse(data);
  if (!parsed.success) throw new TaskflowValidationError(path, parsed.error);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

/** Load incidents for a task from its side file. Returns [] if missing. */
export function loadTaskIncidents(config: TaskflowConfig, task: Task, cwd?: string): Incident[] {
  const path = getIncidentsPath(config, task, cwd);
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = IncidentsFileSchema.safeParse(raw);
  if (!parsed.success) throw new TaskflowValidationError(path, parsed.error);
  return parsed.data.incidents;
}

/** Save incidents for a task to its side file. */
export function saveTaskIncidents(
  config: TaskflowConfig,
  task: Task,
  incidents: Incident[],
  cwd?: string,
): void {
  const folder = resolveTaskFolder(cwd, config, task);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  const path = getIncidentsPath(config, task, cwd);
  const data: IncidentsFile = { taskId: task.id, incidents };
  const parsed = IncidentsFileSchema.safeParse(data);
  if (!parsed.success) throw new TaskflowValidationError(path, parsed.error);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

const INCIDENT_OPEN_STATUSES = new Set(["reported", "investigating", "production-fix", "fixed"]);

/** Update the summary fields on a Task object in place. */
export function recomputeTaskSummary(task: Task, reviews: Review[], incidents: Incident[]): void {
  task.reviewCount = reviews.length;
  task.lastReviewVerdict = reviews.length ? reviews[reviews.length - 1].verdict : null;
  task.openIncidentCount = incidents.filter((inc) => INCIDENT_OPEN_STATUSES.has(inc.status)).length;
  // Inline arrays are deprecated; remove them so shards stay lean.
  if (task.reviews !== undefined) delete task.reviews;
  if (task.incidents !== undefined) delete task.incidents;
}

/**
 * Load the canonical reviews + incidents for a task: side file if present,
 * otherwise the inline arrays from the shard (legacy). Useful in mutation
 * helpers that need to read-modify-write.
 */
export function loadTaskReviewsHybrid(config: TaskflowConfig, task: Task, cwd?: string): Review[] {
  const sideFilePath = getReviewsPath(config, task, cwd);
  if (existsSync(sideFilePath)) return loadTaskReviews(config, task, cwd);
  return task.reviews ?? [];
}

export function loadTaskIncidentsHybrid(
  config: TaskflowConfig,
  task: Task,
  cwd?: string,
): Incident[] {
  const sideFilePath = getIncidentsPath(config, task, cwd);
  if (existsSync(sideFilePath)) return loadTaskIncidents(config, task, cwd);
  return task.incidents ?? [];
}
