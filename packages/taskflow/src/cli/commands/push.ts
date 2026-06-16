import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, now, resolveId } from "../../core/storage.js";
import { writeStatus } from "./status-write.js";

export function cmdPush(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!opts.commit) {
    console.error("--commit is required (commit hash)");
    process.exit(1);
  }
  if (!opts.message) {
    console.error("--message is required (commit message)");
    process.exit(1);
  }

  if (!task.pushes) task.pushes = [];
  if (!task.branch) task.branch = (opts.branch as string) || null;
  if (opts.branch) task.branch = opts.branch as string;

  task.pushes.push({
    at: now(),
    commitHash: opts.commit as string,
    commitMessage: opts.message as string,
  });

  writeStatus(task, "pushed", (opts.by as string) || "task-git");

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "pushed",
      id,
      branch: task.branch,
      pushCount: task.pushes.length,
      commitHash: opts.commit,
    }),
  );
}

export function cmdMrUpdate(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!opts.url) {
    console.error("--url is required (merge request URL)");
    process.exit(1);
  }

  task.mrUrl = opts.url as string;
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "mr-updated", id, mrUrl: opts.url }));
}

export function cmdMerge(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  writeStatus(task, "merged", (opts.by as string) || "task-git");
  task.mergedAt = now();

  const start = new Date(task.createdAt);
  const end = new Date(task.mergedAt);
  task.totalDurationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "merged",
      id,
      mergedAt: task.mergedAt,
      totalDurationMinutes: task.totalDurationMinutes,
    }),
  );
}

export function cmdDone(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  writeStatus(task, "done", (opts.by as string) || "git-agent");
  task.committedAt = now();

  const start = new Date(task.createdAt);
  const end = new Date(task.committedAt);
  task.totalDurationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "done",
      id,
      totalDurationMinutes: task.totalDurationMinutes,
    }),
  );
}
