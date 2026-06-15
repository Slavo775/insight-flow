import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, resolveId } from "../../core/storage.js";
import { mergedProjects } from "../../agents/user-registry.js";

export type SetFlowFailure = "not-found" | "locked" | "unknown-flow";

export interface SetFlowResult {
  ok: boolean;
  error?: SetFlowFailure;
  message?: string;
  flowId?: string;
}

/** Flow ids that exist: "default" plus any custom project flows (N108). */
function knownFlows(): Set<string> {
  try {
    return new Set(Object.keys(mergedProjects()));
  } catch {
    return new Set(["default"]); // malformed user space — only the shipped flow is safe
  }
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
  if (!knownFlows().has(flow)) {
    return {
      ok: false,
      error: "unknown-flow",
      message: `unknown flow "${flow}" (expected "default" or an existing custom flow).`,
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
