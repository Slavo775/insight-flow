// N131 — the lifecycle commands' status write. Resolves the task's flow from
// the merged project registry, then routes through the pure flow-validated
// setter (core/set-status). Flow resolution is DEFENSIVE: a malformed or
// missing custom-flow file must never break a default-flow lifecycle command,
// so any failure falls back to the canonical universe (undefined flow).
import type { Task } from "../../core/types.js";
import { setStatus, type StatusFlow } from "../../core/set-status.js";
import { now } from "../../core/storage.js";
import { mergedChains, mergedProjects } from "../../agents/user-registry.js";
import { chainEntryCommand, chainLinksFrom } from "../../core/chain.js";
import type { Project } from "../../agents/project.js";

/** The merged flows, or undefined (with a warning) when user space is malformed. */
function loadFlows(task: Task): Record<string, Project> | undefined {
  try {
    return mergedProjects();
  } catch (err) {
    console.error(
      `warning: could not load flows (${(err as Error).message}); ` +
        `validating ${task.id} against the canonical status set.`,
    );
    return undefined;
  }
}

function resolveFlow(task: Task, flows = loadFlows(task)): StatusFlow | undefined {
  return flows?.[task.flowId ?? "default"];
}

/**
 * Flow-validated status write for the shipped lifecycle commands. Sets
 * `Task.status` + appends statusHistory; throws InvalidStatusTransitionError if
 * the target is not a status of the task's flow. Default-flow tasks accept
 * every canonical status, so this is byte-identical to the previous inline
 * `task.status = X; task.statusHistory.push(...)`.
 */
export function writeStatus(task: Task, target: string, by: string): void {
  const flows = loadFlows(task);
  setStatus(task, target, { by, at: now() }, resolveFlow(task, flows));
  printChainHint(task, flows);
}

/**
 * N267 — a chained task that just reached a terminal with outgoing chain links
 * gets one `chain next:` line per link on stderr (stdout JSON stays parseable).
 * The handover is resolved here, at run time, so a flow reused in many chains
 * needs no prompt wiring. Best-effort: a broken chain file only warns.
 *
 * The lines print on `setImmediate`, i.e. only after the calling command has
 * saved the shard and returned: every caller saves synchronously right after
 * `writeStatus`, and a failed save exits the CLI (run().catch → exit / crash)
 * before the check phase, so an unsaved status never prints a hint.
 */
function printChainHint(task: Task, flows: Record<string, Project> | undefined): void {
  if (!task.chainId) return;
  if (!flows) {
    console.error(`warning: no chain hint for ${task.id} (flows could not be loaded).`);
    return;
  }
  let lines: string[];
  try {
    const chain = mergedChains(undefined, flows)[task.chainId];
    if (!chain) {
      console.error(
        `warning: ${task.id} is bound to unknown chain '${task.chainId}'; no chain hint.`,
      );
      return;
    }
    lines = chainLinksFrom(chain, task.flowId, task.status).map((link) => {
      const entry = chainEntryCommand(flows[link.to]);
      const when = link.when ? ` — when: ${JSON.stringify(link.when)}` : "";
      return (
        `chain next: flow ${link.to} — run \`insight-flow chain-advance --id ${task.id} --to ${link.to}\`` +
        ` then \`${entry?.command ?? "(no entry agent)"}\` (mode: ${link.mode})${when}`
      );
    });
  } catch (err) {
    console.error(`warning: could not load chains (${(err as Error).message}); no chain hint.`);
    return;
  }
  if (lines.length) setImmediate(() => lines.forEach((line) => console.error(line)));
}

/**
 * Does the task's flow declare a status with this id? Used by flow-aware
 * lifecycle commands (e.g. review-end mapping an AI approval to a distinct
 * `ai-approved` status only when the flow — like `composer-authoring` — has one,
 * leaving the default flow's `approved` behaviour byte-identical).
 */
export function flowDeclaresStatus(task: Task, statusId: string): boolean {
  return (resolveFlow(task)?.statuses ?? []).some((s) => s.id === statusId);
}
