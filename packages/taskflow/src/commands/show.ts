import type { MasterFile, ParsedArgs, TaskflowConfig } from "../types.js";
import {
  loadTaskById,
  loadTaskIncidentsHybrid,
  loadTaskReviewsHybrid,
  resolveId,
} from "../storage.js";
import { loadSpec } from "../spec.js";

export function cmdShow(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const { task } = loadTaskById(config, master, id);

  if (opts.summary) {
    const reviewCount = task.reviewCount ?? loadTaskReviewsHybrid(config, task).length;
    const lastReviewVerdict =
      task.lastReviewVerdict ??
      (() => {
        const r = loadTaskReviewsHybrid(config, task);
        return r.length ? r[r.length - 1].verdict : null;
      })();
    const openIncidentCount =
      task.openIncidentCount ??
      loadTaskIncidentsHybrid(config, task).filter(
        (inc) => inc.status !== "closed" && inc.status !== "verified",
      ).length;

    const summary: Record<string, unknown> = {
      id: task.id,
      title: task.title,
      type: task.type,
      priority: task.priority,
      status: task.status,
      folder: task.folder,
      branch: task.branch,
      mrUrl: task.mrUrl,
      lastReviewVerdict,
      reviewCount,
      openIncidentCount,
    };

    if (opts.spec) {
      const spec = loadSpec(config, task);
      summary.task = spec.task;
      summary.checklist = spec.checklist;
    }

    console.log(JSON.stringify(summary));
    return;
  }

  // Full mode: hydrate side files into the response so consumers see a complete
  // task object (matching the pre-split shape).
  const hydrated: Record<string, unknown> = {
    ...task,
    reviews: loadTaskReviewsHybrid(config, task),
    incidents: loadTaskIncidentsHybrid(config, task),
  };

  if (opts.spec) {
    const spec = loadSpec(config, task);
    hydrated.taskMd = spec.task;
    hydrated.checklistMd = spec.checklist;
  }

  console.log(JSON.stringify(hydrated));
}
