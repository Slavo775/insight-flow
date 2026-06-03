import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { loadTaskById, saveShard, getWorkDir, now, resolveId } from "../../core/storage.js";

export function cmdStatus(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);
  const status = opts.status as string;

  if (!status) {
    console.error("--status is required");
    process.exit(1);
  }

  task.status = status;
  task.statusHistory.push({ status, at: now(), by: (opts.by as string) || "manual" });
  saveShard(getWorkDir(config), shardFile, shard);

  console.log(JSON.stringify({ action: "status-updated", id, status }));
}
