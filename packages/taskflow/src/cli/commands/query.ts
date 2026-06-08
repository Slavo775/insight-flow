import type { MasterFile, TaskflowConfig, ParsedArgs, Task } from "../../core/types.js";
import {
  loadTaskById,
  loadAllTasks,
  saveMaster,
  loadTaskReviewsHybrid,
  loadTaskIncidentsHybrid,
} from "../../core/storage.js";
import { loadSpec } from "../../core/spec.js";

function appendSpec(
  config: TaskflowConfig,
  task: Task,
  payload: Record<string, unknown>,
  opts: ParsedArgs,
): void {
  if (!opts["with-spec"]) return;
  const spec = loadSpec(config, task);
  payload.task = spec.task;
  payload.checklist = spec.checklist;
}

export function cmdCurrent(config: TaskflowConfig, master: MasterFile): void {
  const id = master.meta.currentTaskId;
  if (!id) {
    console.log(JSON.stringify({ currentTaskId: null, task: null }));
    return;
  }
  try {
    const { task } = loadTaskById(config, master, id);
    console.log(
      JSON.stringify({
        currentTaskId: id,
        title: task.title,
        status: task.status,
        folder: task.folder,
      }),
    );
  } catch {
    console.log(JSON.stringify({ currentTaskId: id, task: null }));
  }
}

export function cmdList(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  let tasks = loadAllTasks(config, master);
  if (opts.status) {
    tasks = tasks.filter((t) => t.status === opts.status);
  }
  const summary = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    status: t.status,
  }));
  console.log(JSON.stringify(summary));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function tokenStats(values: number[]): {
  count: number;
  min: number;
  median: number;
  p90: number;
  max: number;
  allTimeAvg: number;
  last5Avg: number | null;
} | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, n) => s + n, 0);
  const last5 = values.slice(-5);
  const last5Sum = last5.reduce((s, n) => s + n, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    max: sorted[sorted.length - 1],
    allTimeAvg: Math.round(sum / sorted.length),
    last5Avg: last5.length ? Math.round(last5Sum / last5.length) : null,
  };
}

export function cmdStats(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const tasks = loadAllTasks(config, master);
  const total = tasks.length;

  if (opts.tokens) {
    const overallValues: number[] = [];
    const byTypeValues: Record<string, number[]> = {};
    const byPriorityValues: Record<string, number[]> = {};

    for (const task of tasks) {
      const used = task.implementation?.tokensUsed;
      if (!used || used <= 0) continue;
      overallValues.push(used);
      (byTypeValues[task.type] ??= []).push(used);
      (byPriorityValues[task.priority] ??= []).push(used);
    }

    const byType: Record<string, ReturnType<typeof tokenStats>> = {};
    for (const [k, v] of Object.entries(byTypeValues)) byType[k] = tokenStats(v);
    const byPriority: Record<string, ReturnType<typeof tokenStats>> = {};
    for (const [k, v] of Object.entries(byPriorityValues)) byPriority[k] = tokenStats(v);

    console.log(
      JSON.stringify(
        {
          tasksWithTokens: overallValues.length,
          tasksWithoutTokens: total - overallValues.length,
          overall: tokenStats(overallValues),
          byType,
          byPriority,
        },
        null,
        2,
      ),
    );
    return;
  }

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let totalDuration = 0;
  let completedCount = 0;
  let totalTokens = 0;
  let totalReviews = 0;
  let fixNeededCount = 0;
  let fixCycles = 0;
  let fixedCount = 0;
  let totalIncidents = 0;

  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    byType[task.type] = (byType[task.type] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

    if (task.totalDurationMinutes) {
      totalDuration += task.totalDurationMinutes;
      completedCount++;
    }
    if (task.implementation.tokensUsed) {
      totalTokens += task.implementation.tokensUsed;
    }
    const reviews = loadTaskReviewsHybrid(config, task);
    const incidents = loadTaskIncidentsHybrid(config, task);
    totalReviews += reviews.length;
    fixNeededCount += reviews.filter((r) => r.verdict === "fix-needed").length;

    for (const review of reviews) {
      if (review.fix) {
        fixCycles++;
        if (review.fix.status === "fixed") fixedCount++;
      }
    }
    totalIncidents += incidents.length;
  }

  const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : null;
  const firstPassRate =
    totalReviews > 0 ? Math.round(((totalReviews - fixNeededCount) / totalReviews) * 100) : null;

  console.log(
    JSON.stringify(
      {
        total,
        byStatus,
        byType,
        byPriority,
        avgDurationMinutes: avgDuration,
        totalTokensUsed: totalTokens || null,
        totalIncidents,
        reviewStats: {
          totalReviews,
          fixNeededCount,
          fixCycles,
          fixedCount,
          firstPassRate: firstPassRate ? `${firstPassRate}%` : null,
        },
      },
      null,
      2,
    ),
  );
}

const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_WEIGHT: Record<string, number> = {
  "fix-needed": 0,
  "changes-requested": 1,
  "changes-implementing": 2,
  "in-progress": 3,
  ready: 4,
};

export function cmdNext(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const tasks = loadAllTasks(config, master);
  const actionable = tasks.filter((t) =>
    ["fix-needed", "changes-requested", "ready", "in-progress", "changes-implementing"].includes(
      t.status,
    ),
  );

  if (actionable.length === 0) {
    console.log(
      JSON.stringify({
        next: null,
        message: "No actionable tasks. Create one with taskflow create.",
      }),
    );
    return;
  }

  actionable.sort((a, b) => {
    const sa = STATUS_WEIGHT[a.status] ?? 9;
    const sb = STATUS_WEIGHT[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pick = actionable[0];
  master.meta.currentTaskId = pick.id;
  saveMaster(config, master);

  const payload: Record<string, unknown> = {
    next: pick.id,
    title: pick.title,
    type: pick.type,
    priority: pick.priority,
    status: pick.status,
    folder: pick.folder,
    reason:
      pick.status === "fix-needed"
        ? "Review requested changes — fix first"
        : pick.status === "changes-requested"
          ? "Change requests pending — implement changes"
          : pick.status === "changes-implementing"
            ? "Resume interrupted change implementation"
            : pick.status === "in-progress"
              ? "Resume interrupted implementation"
              : `Highest priority ready task (${pick.priority})`,
  };
  appendSpec(config, pick, payload, opts);
  console.log(JSON.stringify(payload));
}

export function cmdNextReview(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const tasks = loadAllTasks(config, master);
  const reviewable = tasks.filter((t) => ["implemented", "pushed", "fixed"].includes(t.status));

  if (reviewable.length === 0) {
    console.log(JSON.stringify({ next: null, message: "No tasks awaiting review." }));
    return;
  }

  reviewable.sort((a, b) => {
    const sa = a.status === "fixed" ? 0 : 1;
    const sb = b.status === "fixed" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pick = reviewable[0];
  master.meta.currentTaskId = pick.id;
  saveMaster(config, master);

  const reviewCount = pick.reviewCount ?? loadTaskReviewsHybrid(config, pick).length;
  const payload: Record<string, unknown> = {
    next: pick.id,
    title: pick.title,
    type: pick.type,
    priority: pick.priority,
    status: pick.status,
    folder: pick.folder,
    reviewRound: reviewCount + 1,
    reason:
      pick.status === "fixed"
        ? `Re-review after fixes (round ${reviewCount + 1})`
        : "First review after implementation",
  };
  appendSpec(config, pick, payload, opts);
  console.log(JSON.stringify(payload));
}

export function cmdNextFix(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const tasks = loadAllTasks(config, master);
  const fixable = tasks.filter((t) => t.status === "fix-needed");

  if (fixable.length === 0) {
    console.log(JSON.stringify({ next: null, message: "No tasks needing fixes." }));
    return;
  }

  fixable.sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pick = fixable[0];
  master.meta.currentTaskId = pick.id;
  saveMaster(config, master);

  const reviews = loadTaskReviewsHybrid(config, pick);
  const lastReview = reviews[reviews.length - 1];

  const payload: Record<string, unknown> = {
    next: pick.id,
    title: pick.title,
    type: pick.type,
    priority: pick.priority,
    status: pick.status,
    folder: pick.folder,
    reviewComment: lastReview?.comment || null,
    reason: `Fix requested by reviewer (review round ${reviews.length})`,
  };
  appendSpec(config, pick, payload, opts);
  console.log(JSON.stringify(payload));
}
