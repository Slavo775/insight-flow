import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, resolveId } from "../../core/storage.js";
import { mergedChains, mergedProjects } from "../../agents/user-registry.js";
import type { Project } from "../../agents/project.js";

export type SetFlowFailure =
  | "not-found"
  | "locked"
  | "unknown-flow"
  | "outside-chain"
  | "chain-unreadable";

export interface SetFlowResult {
  ok: boolean;
  error?: SetFlowFailure;
  message?: string;
  flowId?: string;
}

/**
 * N117 — reassign a task's flow (`Task.flowId`). Allowed ONLY while the task is
 * `ready`: once work starts the flow locks, which deliberately avoids any
 * mid-lifecycle status-vs-flow reconciliation. Shared by the CLI and the
 * dashboard endpoint so both enforce the same guards.
 */
export function setTaskFlow(
  config: TaskflowConfig,
  master: MasterFile,
  id: string,
  flow: string,
): SetFlowResult {
  let loaded;
  try {
    loaded = jsonFileStorage.loadTaskById(config, master, id);
  } catch {
    return { ok: false, error: "not-found", message: `task "${id}" not found` };
  }
  const { task, shard, shardFile } = loaded;

  if (task.status !== "ready") {
    return {
      ok: false,
      error: "locked",
      message: `cannot change flow: ${id} is "${task.status}" — the flow locks once work starts (ready only).`,
    };
  }
  // One registry read for both checks. Flow ids that exist: "default" plus any
  // custom project flows (N108); a malformed user space leaves only the shipped flow.
  let flows: Record<string, Project> | undefined;
  try {
    flows = mergedProjects();
  } catch {
    flows = undefined;
  }
  if (flows ? !Object.hasOwn(flows, flow) : flow !== "default") {
    return {
      ok: false,
      error: "unknown-flow",
      message: `unknown flow "${flow}" (expected "default" or an existing custom flow).`,
    };
  }

  // N267 — a chained task stays inside its chain (same rule as create/set-chain).
  // Fails closed: if the chain can't be read, the guard can't run, so refuse
  // rather than move the task out silently. A chain that no longer exists
  // (dangling binding) has nothing to guard.
  let chain;
  if (task.chainId) {
    try {
      if (!flows) throw new Error("flows could not be loaded");
      chain = mergedChains(undefined, flows)[task.chainId];
    } catch (err) {
      return {
        ok: false,
        error: "chain-unreadable",
        message: `cannot check chain "${task.chainId}" (${(err as Error).message}) — fix it, or clear the chain first (set-chain --id ${id} --chain none).`,
      };
    }
  }
  if (chain && !chain.flows.includes(flow)) {
    return {
      ok: false,
      error: "outside-chain",
      message: `flow "${flow}" is not part of chain "${chain.id}" — clear the chain first (set-chain --id ${id} --chain none).`,
    };
  }

  task.flowId = flow;
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  return { ok: true, flowId: flow };
}

export function cmdSetFlow(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const flow = opts.flow as string | undefined;
  if (!flow) {
    console.error("--flow <flowId> is required");
    process.exit(1);
  }

  const result = setTaskFlow(config, master, id, flow);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(JSON.stringify({ action: "flow-set", id, flowId: result.flowId }));
}
