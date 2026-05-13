import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { MasterFile, ShardFile, Task, TaskflowConfig } from "./types.js";
import { getWorkDir, getMasterPath } from "./config.js";
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
    throw new Error(
      `master.json not found at ${masterPath}. Run 'taskflow init' to initialize.`,
    );
  }
  return JSON.parse(readFileSync(masterPath, "utf-8"));
}

export function saveMaster(config: TaskflowConfig, master: MasterFile, cwd?: string): void {
  const masterPath = getMasterPath(config, cwd);
  writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n");
}

export function loadShard(workDir: string, shardFile: string): ShardFile {
  const path = getShardPath(workDir, shardFile);
  if (!existsSync(path)) {
    return { range: { from: 0, to: 9 }, tasks: [] };
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveShard(workDir: string, shardFile: string, data: ShardFile): void {
  writeFileSync(getShardPath(workDir, shardFile), JSON.stringify(data, null, 2) + "\n");
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
