import { readFileSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import type { MasterFile, Task, TaskflowConfig } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import {
  getWorkDir,
  parseTaskNum,
  loadTaskIncidentsHybrid,
  loadTaskReviewsHybrid,
  recomputeTaskSummary,
} from "../../core/storage.js";
import { getMasterPath } from "../../core/config.js";

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
    const shardFile = jsonFileStorage.getShardFileName(num, config.shardSize);

    if (!shardMap[shardFile]) {
      const base = Math.floor(num / config.shardSize) * config.shardSize;
      shardMap[shardFile] = { range: { from: base, to: base + config.shardSize - 1 }, tasks: [] };
    }
    shardMap[shardFile].tasks.push(task);
  }

  for (const [shardFile, shardData] of Object.entries(shardMap)) {
    master.meta.shards.push(shardFile);
    jsonFileStorage.saveShard(
      workDir,
      shardFile,
      shardData as { range: { from: number; to: number }; tasks: never[] },
    );
  }

  master.meta.shards.sort();

  if (master.meta.shards.length === 0) {
    const shardFile = "tasks-N00-N09.json";
    master.meta.shards.push(shardFile);
    jsonFileStorage.saveShard(workDir, shardFile, { range: { from: 0, to: 9 }, tasks: [] });
  }

  jsonFileStorage.saveMaster(config, master);
  renameSync(oldTrackerPath, oldTrackerPath + ".bak");

  console.log(
    JSON.stringify({
      action: "migrated",
      shardsCreated: master.meta.shards,
      tasksMigrated: (old.tasks as unknown[]).length,
      backupAt: "workTasks/tracker.json.bak",
    }),
  );
}

/**
 * Split inline `reviews` and `incidents` arrays in every existing shard into
 * per-task side files. Idempotent: tasks that already have side files (or no
 * inline arrays) are skipped. Required once after upgrading to the v2 schema.
 */
export function cmdMigrateReviews(config: TaskflowConfig): void {
  const workDir = getWorkDir(config);
  let master: MasterFile;
  try {
    master = jsonFileStorage.loadMaster(config);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const tasksSplit: string[] = [];
  const shardsTouched: string[] = [];

  for (const shardFile of master.meta.shards) {
    const shard = jsonFileStorage.loadShard(workDir, shardFile);
    let shardChanged = false;

    for (const task of shard.tasks as Task[]) {
      const hadReviews = Array.isArray(task.reviews) && task.reviews.length > 0;
      const hadIncidents = Array.isArray(task.incidents) && task.incidents.length > 0;

      if (hadReviews) jsonFileStorage.saveTaskReviews(config, task, task.reviews ?? []);
      if (hadIncidents) jsonFileStorage.saveTaskIncidents(config, task, task.incidents ?? []);

      // Load from side files (or the just-saved inline arrays) so re-runs
      // recompute summary from the canonical source instead of the stripped
      // inline arrays. This is what makes the migration truly idempotent.
      const reviews = loadTaskReviewsHybrid(config, task);
      const incidents = loadTaskIncidentsHybrid(config, task);

      const beforeReviewCount = task.reviewCount;
      const beforeLastVerdict = task.lastReviewVerdict;
      const beforeOpenIncidents = task.openIncidentCount;
      recomputeTaskSummary(task, reviews, incidents);

      const summaryChanged =
        beforeReviewCount !== task.reviewCount ||
        beforeLastVerdict !== task.lastReviewVerdict ||
        beforeOpenIncidents !== task.openIncidentCount;

      if (hadReviews || hadIncidents || summaryChanged) {
        shardChanged = true;
        if (hadReviews || hadIncidents) tasksSplit.push(task.id);
      }
    }

    if (shardChanged) {
      jsonFileStorage.saveShard(workDir, shardFile, shard);
      shardsTouched.push(shardFile);
    }
  }

  console.log(
    JSON.stringify({
      action: "migrate-reviews",
      tasksSplit,
      shardsTouched,
    }),
  );
}
