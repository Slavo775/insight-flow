import { readFileSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir, getShardFileName, saveShard, saveMaster, parseTaskNum } from "../storage.js";
import { getMasterPath } from "../config.js";

export function cmdMigrate(config: TaskflowConfig): void {
  const workDir = getWorkDir(config);
  const masterPath = getMasterPath(config);
  const oldTrackerPath = resolve(workDir, "tracker.json");

  if (existsSync(masterPath)) {
    console.error("master.json already exists. Migration already done or run manually.");
    process.exit(1);
  }

  if (!existsSync(oldTrackerPath)) {
    console.error("tracker.json not found. Nothing to migrate.");
    process.exit(1);
  }

  const old = JSON.parse(readFileSync(oldTrackerPath, "utf-8"));

  const master = {
    meta: {
      nextId: old.meta.nextId as number,
      currentTaskId: (old.meta.currentTaskId as string) || null,
      nextIncidentId: 1,
      shards: [] as string[],
    },
  };

  const shardMap: Record<string, { range: { from: number; to: number }; tasks: unknown[] }> = {};

  for (const task of old.tasks as Array<Record<string, unknown>>) {
    if (!task.incidents) task.incidents = [];

    const num = parseTaskNum(task.id as string);
    const shardFile = getShardFileName(num, config.shardSize);

    if (!shardMap[shardFile]) {
      const base = Math.floor(num / config.shardSize) * config.shardSize;
      shardMap[shardFile] = { range: { from: base, to: base + config.shardSize - 1 }, tasks: [] };
    }
    shardMap[shardFile].tasks.push(task);
  }

  for (const [shardFile, shardData] of Object.entries(shardMap)) {
    master.meta.shards.push(shardFile);
    saveShard(workDir, shardFile, shardData as { range: { from: number; to: number }; tasks: never[] });
  }

  master.meta.shards.sort();

  if (master.meta.shards.length === 0) {
    const shardFile = "tasks-N00-N09.json";
    master.meta.shards.push(shardFile);
    saveShard(workDir, shardFile, { range: { from: 0, to: 9 }, tasks: [] });
  }

  saveMaster(config, master);
  renameSync(oldTrackerPath, oldTrackerPath + ".bak");

  console.log(
    JSON.stringify({
      action: "migrated",
      shardsCreated: master.meta.shards,
      tasksMigrated: (old.tasks as unknown[]).length,
      backupAt: "workTasks/tracker.json.bak",
    }, null, 2),
  );
}
