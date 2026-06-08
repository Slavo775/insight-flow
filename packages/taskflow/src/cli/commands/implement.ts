import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, now, resolveId } from "../../core/storage.js";

export function cmdImplementStart(
  config: TaskflowConfig,
  master: MasterFile,
  opts: ParsedArgs,
): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  task.status = "in-progress";
  task.implementation.startedAt = now();
  task.statusHistory.push({
    status: "in-progress",
    at: now(),
    by: (opts.by as string) || "task-implement",
  });

  if (opts.tokens) {
    task.implementation.tokensUsed = parseInt(opts.tokens as string, 10);
  }

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({ action: "implement-started", id, startedAt: task.implementation.startedAt }),
  );
}

export function cmdImplementEnd(
  config: TaskflowConfig,
  master: MasterFile,
  opts: ParsedArgs,
): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  task.status = "implemented";
  task.implementation.completedAt = now();
  task.statusHistory.push({
    status: "implemented",
    at: now(),
    by: (opts.by as string) || "task-implement",
  });

  if (opts.files) {
    task.implementation.filesChanged = (opts.files as string).split(",").map((f) => f.trim());
  }

  if (opts.tokens) {
    const prev = task.implementation.tokensUsed || 0;
    task.implementation.tokensUsed = prev + parseInt(opts.tokens as string, 10);
  }

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "implement-ended",
      id,
      status: "implemented",
      completedAt: task.implementation.completedAt,
      filesChanged: task.implementation.filesChanged.length,
    }),
  );
}
