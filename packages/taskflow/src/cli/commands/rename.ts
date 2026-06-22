import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, resolveId } from "../../core/storage.js";

/**
 * N170 — update a task's title (and optionally type/priority) through the
 * storage layer. Created tasks were otherwise immutable in these fields, and
 * AGENT_ENFORCEMENT forbids hand-editing the shard JSON — so a reframed/rescoped
 * task's metadata could drift from its docs (hit on N165 title, N167 type). The
 * task folder/slug and branch are left stable (referenced elsewhere).
 */
export function cmdRename(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const title = opts.title as string | undefined;
  const type = opts.type as string | undefined;
  const priority = opts.priority as string | undefined;

  if (!title && !type && !priority) {
    console.error("at least one of --title, --type, --priority is required");
    process.exit(1);
  }

  let loaded;
  try {
    loaded = jsonFileStorage.loadTaskById(config, master, id);
  } catch {
    console.error(`task "${id}" not found`);
    process.exit(1);
  }
  const { task, shard, shardFile } = loaded;

  if (title) task.title = title;
  if (type) task.type = type;
  if (priority) task.priority = priority;

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "renamed",
      id,
      title: task.title,
      type: task.type,
      priority: task.priority,
    }),
  );
}
