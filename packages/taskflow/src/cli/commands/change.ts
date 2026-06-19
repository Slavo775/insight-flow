import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, now, resolveId, loadTaskReviewsHybrid } from "../../core/storage.js";
import { recordTaskLifecycle } from "../../core/observability/langfuse.js";
import { writeStatus } from "./status-write.js";

export function cmdChangeRequest(
  config: TaskflowConfig,
  master: MasterFile,
  opts: ParsedArgs,
): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!opts.description) {
    console.error("--description is required");
    process.exit(1);
  }

  if (!task.changesAfterImplementation) task.changesAfterImplementation = [];

  task.changesAfterImplementation.push({
    requestedAt: now(),
    description: opts.description as string,
    requestedBy: (opts.by as string) || "task-request-changes",
    status: "requested",
    implementedAt: null,
    filesChanged: [],
    comment: null,
    implementedBy: null,
  });

  writeStatus(task, "changes-requested", (opts.by as string) || "task-request-changes");

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "change-requested",
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
      description: opts.description,
    }),
  );
}

export function cmdChangeStart(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!task.changesAfterImplementation || task.changesAfterImplementation.length === 0) {
    console.error("No change requests found. Run change-request first.");
    process.exit(1);
  }

  const lastChange = task.changesAfterImplementation[task.changesAfterImplementation.length - 1];
  if (lastChange.status !== "requested") {
    console.error(`Last change request status is "${lastChange.status}", expected "requested".`);
    process.exit(1);
  }

  lastChange.status = "implementing";
  writeStatus(task, "changes-implementing", (opts.by as string) || "implement-changes");

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "change-started",
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
    }),
  );
}

export function cmdChangeEnd(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!task.changesAfterImplementation || task.changesAfterImplementation.length === 0) {
    console.error("No change requests found. Run change-request first.");
    process.exit(1);
  }

  const lastChange = task.changesAfterImplementation[task.changesAfterImplementation.length - 1];
  if (lastChange.status !== "implementing") {
    console.error(`Last change request status is "${lastChange.status}", expected "implementing".`);
    process.exit(1);
  }

  lastChange.status = "implemented";
  lastChange.implementedAt = now();
  lastChange.comment = (opts.comment as string) || null;
  lastChange.implementedBy = (opts.by as string) || "implement-changes";

  if (opts.files) {
    lastChange.filesChanged = (opts.files as string).split(",").map((f) => f.trim());
  }

  writeStatus(task, "changes-implemented", (opts.by as string) || "implement-changes");

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  recordTaskLifecycle(config, task, loadTaskReviewsHybrid(config, task));
  console.log(
    JSON.stringify({
      action: "change-ended",
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
      filesChanged: lastChange.filesChanged.length,
    }),
  );
}

export function cmdNextChange(config: TaskflowConfig, master: MasterFile): void {
  const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const tasks = jsonFileStorage.loadAllTasks(config, master);
  const changeable = tasks.filter((t) => t.status === "changes-requested");

  if (changeable.length === 0) {
    console.log(JSON.stringify({ next: null, message: "No tasks with pending change requests." }));
    return;
  }

  changeable.sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pick = changeable[0];
  master.meta.currentTaskId = pick.id;
  jsonFileStorage.saveMaster(config, master);

  const lastChange = pick.changesAfterImplementation?.[pick.changesAfterImplementation.length - 1];

  console.log(
    JSON.stringify({
      next: pick.id,
      title: pick.title,
      type: pick.type,
      priority: pick.priority,
      status: pick.status,
      folder: pick.folder,
      changeDescription: lastChange?.description || null,
      reason: `Change request pending (${pick.changesAfterImplementation?.length || 0} total)`,
    }),
  );
}
