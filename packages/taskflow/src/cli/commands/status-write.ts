// N131 — the lifecycle commands' status write. Resolves the task's flow from
// the merged project registry, then routes through the pure flow-validated
// setter (core/set-status). Flow resolution is DEFENSIVE: a malformed or
// missing custom-flow file must never break a default-flow lifecycle command,
// so any failure falls back to the canonical universe (undefined flow).
import type { Task } from "../../core/types.js";
import { setStatus, type StatusFlow } from "../../core/set-status.js";
import { now } from "../../core/storage.js";
import { mergedProjects } from "../../agents/user-registry.js";

function resolveFlow(task: Task): StatusFlow | undefined {
  try {
    return mergedProjects()[task.flowId ?? "default"];
  } catch {
    return undefined; // canonical universe — never block on a custom-flow file
  }
}

/**
 * Flow-validated status write for the shipped lifecycle commands. Sets
 * `Task.status` + appends statusHistory; throws InvalidStatusTransitionError if
 * the target is not a status of the task's flow. Default-flow tasks accept
 * every canonical status, so this is byte-identical to the previous inline
 * `task.status = X; task.statusHistory.push(...)`.
 */
export function writeStatus(task: Task, target: string, by: string): void {
  setStatus(task, target, { by, at: now() }, resolveFlow(task));
}
