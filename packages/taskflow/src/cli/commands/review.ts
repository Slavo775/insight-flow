import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import {
  getWorkDir,
  now,
  resolveId,
  loadTaskReviewsHybrid,
  loadTaskIncidentsHybrid,
  recomputeTaskSummary,
} from "../../core/storage.js";
import { scaffoldReviewMd } from "../../core/spec.js";

export function cmdReviewStart(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  task.status = "reviewing";
  task.statusHistory.push({
    status: "reviewing",
    at: now(),
    by: (opts.by as string) || "task-review",
  });

  const reviews = loadTaskReviewsHybrid(config, task);
  reviews.push({
    startedAt: now(),
    endedAt: null,
    verdict: null,
    comment: null,
    type: (opts.type as "ai" | "human") || "ai",
    by: (opts.by as string) || "task-review",
    fix: null,
  });
  jsonFileStorage.saveTaskReviews(config, task, reviews);

  recomputeTaskSummary(task, reviews, loadTaskIncidentsHybrid(config, task));
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);

  const scaffold = scaffoldReviewMd(config, task, {
    reviewer:
      (opts.type as string) === "human"
        ? "Human (Project Owner)"
        : `Task Reviewer (${(opts.type as string) || "ai"})`,
    date: now().slice(0, 10),
    prUrl: task.mrUrl ?? "(no PR yet)",
  });

  console.log(
    JSON.stringify({
      action: "review-started",
      id,
      reviewIndex: reviews.length - 1,
      reviewMd: {
        created: scaffold.created,
        round: scaffold.round,
        path: `${task.folder}/REVIEW.md`,
      },
    }),
  );
}

export function cmdReviewEnd(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);

  if (!opts.verdict) {
    console.error("--verdict is required (approved | fix-needed)");
    process.exit(1);
  }

  const reviews = loadTaskReviewsHybrid(config, task);
  const review = reviews[reviews.length - 1];
  if (!review) {
    console.error("No active review found. Run review-start first.");
    process.exit(1);
  }

  review.endedAt = now();
  review.verdict = opts.verdict as string;
  review.comment = (opts.comment as string) || null;
  if (opts.type) review.type = opts.type as "ai" | "human";
  if (opts.by) review.by = opts.by as string;
  jsonFileStorage.saveTaskReviews(config, task, reviews);

  task.status = opts.verdict as string;
  task.statusHistory.push({
    status: opts.verdict as string,
    at: now(),
    by: (opts.by as string) || review.by || "task-review",
  });

  recomputeTaskSummary(task, reviews, loadTaskIncidentsHybrid(config, task));
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "review-ended", id, verdict: opts.verdict }));
}
