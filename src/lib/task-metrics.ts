import type { Task } from "./task-types";

export interface ComputedMetrics {
  total: number;
  merged: number;
  inFlight: number;
  fixNeededCount: number;
  fixRate: number;
  avgReviewRounds: number;
  avgCycleHours: number;
  totalCommits: number;
  aiApprovals: number;
  humanApprovals: number;
  totalIncidents: number;
  openIncidents: number;
}

export function computeMetrics(tasks: Task[]): ComputedMetrics {
  const total = tasks.length;
  const merged = tasks.filter((t) => t.status === "merged").length;
  const inFlight = tasks.filter((t) => t.status !== "merged").length;
  let fixCount = 0;
  let reviewRounds = 0;
  let cycleSum = 0;
  let cycleN = 0;
  let commits = 0;
  let aiApprovals = 0;
  let humanApprovals = 0;
  for (const t of tasks) {
    reviewRounds += t.reviews.length;
    fixCount += t.reviews.filter((r) => r.verdict === "fix-needed").length;
    commits += t.pushes?.length ?? 0;
    for (const r of t.reviews) {
      if (r.verdict === "approved" && r.type === "ai") aiApprovals++;
      if (r.verdict === "approved" && r.type === "human") humanApprovals++;
    }
    if (t.mergedAt && t.createdAt) {
      cycleSum += (new Date(t.mergedAt).getTime() - new Date(t.createdAt).getTime()) / 36e5;
      cycleN++;
    }
  }
  return {
    total,
    merged,
    inFlight,
    fixNeededCount: fixCount,
    fixRate: total ? fixCount / total : 0,
    avgReviewRounds: total ? reviewRounds / total : 0,
    avgCycleHours: cycleN ? cycleSum / cycleN : 0,
    totalCommits: commits,
    aiApprovals,
    humanApprovals,
  };
}

export function fileHotspots(tasks: Task[], limit = 10) {
  const map = new Map<string, number>();
  for (const t of tasks) {
    const files = new Set<string>(t.implementation.filesChanged ?? []);
    for (const r of t.reviews) {
      for (const f of r.fix?.filesChanged ?? []) files.add(f);
    }
    for (const f of files) map.set(f, (map.get(f) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function tagDistribution(tasks: Task[]) {
  const map = new Map<string, number>();
  for (const t of tasks) for (const tag of t.tags ?? []) map.set(tag, (map.get(tag) ?? 0) + 1);
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function agentActivity(tasks: Task[]) {
  const map = new Map<string, number>();
  for (const t of tasks) {
    for (const h of t.statusHistory) map.set(h.by, (map.get(h.by) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([agent, actions]) => ({ agent, actions }))
    .sort((a, b) => b.actions - a.actions);
}

export function reviewRoundsPerTask(tasks: Task[]) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    rounds: t.reviews.length,
    fixNeeded: t.reviews.filter((r) => r.verdict === "fix-needed").length,
  }));
}

/** Build lifecycle segments from statusHistory, returning duration in ms. */
export function lifecycleSegments(task: Task) {
  const history = [...task.statusHistory].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const segs: { status: string; start: number; end: number; by: string }[] = [];
  for (let i = 0; i < history.length; i++) {
    const start = new Date(history[i].at).getTime();
    const end = i + 1 < history.length ? new Date(history[i + 1].at).getTime() : start;
    segs.push({ status: history[i].status, start, end, by: history[i].by });
  }
  return segs;
}
