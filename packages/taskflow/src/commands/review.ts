import type { MasterFile, TaskflowConfig, ParsedArgs } from "../types.js";
import { loadTaskById, saveShard, getWorkDir, now, resolveId } from "../storage.js";

export function cmdReviewStart(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  task.status = "reviewing";
  task.statusHistory.push({ status: "reviewing", at: now(), by: (opts.by as string) || "task-review" });

  task.reviews.push({
    startedAt: now(),
    endedAt: null,
    verdict: null,
    comment: null,
    type: (opts.type as "ai" | "human") || "ai",
    by: (opts.by as string) || "task-review",
    fix: null,
  });

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "review-started", id, reviewIndex: task.reviews.length - 1 }, null, 2));
}

export function cmdReviewEnd(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = loadTaskById(config, master, id);

  if (!opts.verdict) {
    console.error("--verdict is required (approved | fix-needed)");
    process.exit(1);
  }

  const review = task.reviews[task.reviews.length - 1];
  if (!review) {
    console.error("No active review found. Run review-start first.");
    process.exit(1);
  }

  review.endedAt = now();
  review.verdict = opts.verdict as string;
  review.comment = (opts.comment as string) || null;
  if (opts.type) review.type = opts.type as "ai" | "human";
  if (opts.by) review.by = opts.by as string;

  task.status = opts.verdict as string;
  task.statusHistory.push({ status: opts.verdict as string, at: now(), by: (opts.by as string) || review.by || "task-review" });

  saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "review-ended", id, verdict: opts.verdict }, null, 2));
}
