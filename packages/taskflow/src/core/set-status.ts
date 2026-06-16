// N131 — the generic, flow-validated status setter. Pure (no fs): given the
// task's flow, it validates the target against the flow's status universe and
// then writes Task.status + appends statusHistory. The shipped lifecycle
// commands route every status write through it (via cli writeStatus, which
// resolves the flow). For the DEFAULT flow the universe is the canonical enum,
// so every canonical transition is accepted and behavior is byte-identical;
// a custom flow rejects any status it does not declare.
import type { Task } from "./types.js";
import { TASK_STATUSES } from "./statuses.js";

/** Just enough of a flow to validate against — its declared status set (N128). */
export interface StatusFlow {
  statuses?: { id: string }[];
}

export interface SetStatusOptions {
  by: string;
  /** ISO timestamp for the statusHistory entry (caller passes now()). */
  at: string;
}

export class InvalidStatusTransitionError extends Error {
  readonly taskId: string;
  readonly target: string;
  readonly flowId: string;
  readonly allowed: string[];
  constructor(taskId: string, target: string, flowId: string, allowed: string[]) {
    super(
      `Cannot set task ${taskId} to status '${target}': not a status of flow '${flowId}'. ` +
        `Allowed: ${allowed.join(", ")}.`,
    );
    this.name = "InvalidStatusTransitionError";
    this.taskId = taskId;
    this.target = target;
    this.flowId = flowId;
    this.allowed = allowed;
  }
}

/**
 * The flow's status universe: its declared set (N128), or the canonical enum
 * when it declares none or is unknown. Matches the schema's empty-set fallback
 * so legacy/custom flows authored before N128 keep accepting canonical statuses.
 */
export function flowStatusUniverse(flow?: StatusFlow): string[] {
  const ids = flow?.statuses?.map((s) => s.id) ?? [];
  return ids.length ? ids : [...TASK_STATUSES];
}

/**
 * Set a task's status through its flow. Validates `target` against the flow's
 * status universe, then writes `Task.status` and appends a statusHistory entry.
 * Throws {@link InvalidStatusTransitionError} when the target is not a status of
 * the flow.
 */
export function setStatus(
  task: Task,
  target: string,
  options: SetStatusOptions,
  flow?: StatusFlow,
): void {
  const universe = flowStatusUniverse(flow);
  if (!universe.includes(target)) {
    throw new InvalidStatusTransitionError(task.id, target, task.flowId ?? "default", universe);
  }
  task.status = target;
  task.statusHistory.push({ status: target, at: options.at, by: options.by });
}
