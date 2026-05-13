import type { MasterFile, TaskflowConfig, ParsedArgs } from "../types.js";
import { loadTaskById, saveShard, getWorkDir, now, resolveId } from "../storage.js";

export function cmdFixStart(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  const lastReview = task.reviews[task.reviews.length - 1];
  if (!lastReview || lastReview.verdict !== "fix-needed") {
    console.error("No fix-needed review found. Run review-end --verdict fix-needed first.");
    process.exit(1);
  }

  task.status = "fixing";
  task.statusHistory.push({ status: "fixing", at: now(), by: (opts.by as string) || "task-review-fix" });

  lastReview.fix = {
    startedAt: now(),
    endedAt: null,
    status: "in-progress",
    filesChanged: [],
    comment: null,
    by: (opts.by as string) || "task-review-fix",
  };

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "fix-started", id, reviewIndex: task.reviews.length - 1 }, null, 2));
}

export function cmdFixEnd(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  const lastReview = task.reviews[task.reviews.length - 1];
  if (!lastReview || !lastReview.fix || lastReview.fix.status !== "in-progress") {
    console.error("No in-progress fix found. Run fix-start first.");
    process.exit(1);
  }

  lastReview.fix.endedAt = now();
  lastReview.fix.status = "fixed";
  lastReview.fix.comment = (opts.comment as string) || null;

  if (opts.files) {
    lastReview.fix.filesChanged = (opts.files as string).split(",").map((f) => f.trim());
  }

  task.status = "fixed";
  task.statusHistory.push({ status: "fixed", at: now(), by: (opts.by as string) || "task-review-fix" });

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(
    JSON.stringify({
      action: "fix-ended",
      id,
      status: "fixed",
      reviewIndex: task.reviews.length - 1,
      filesChanged: lastReview.fix.filesChanged.length,
    }, null, 2),
  );
}
