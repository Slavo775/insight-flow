import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import type { Chain } from "../../core/schema/index.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, resolveId } from "../../core/storage.js";
import { mergedChains } from "../../agents/user-registry.js";

export type SetChainFailure = "not-found" | "locked" | "unknown-chain";

export interface SetChainResult {
  ok: boolean;
  error?: SetChainFailure;
  message?: string;
  chainId?: string | null;
  flowId?: string;
}

/**
 * N267 — bind (or clear, with "none") a task's chain. Ready-only, like
 * `setTaskFlow` (N117). A task whose flow is not in the chain is re-seated in
 * the chain's entry flow. Shared by the CLI and (N269) the dashboard endpoint.
 */
export function setTaskChain(
  config: TaskflowConfig,
  master: MasterFile,
  id: string,
  chainId: string,
): SetChainResult {
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
      message: `cannot change chain: ${id} is "${task.status}" — the chain locks once work starts (ready only).`,
    };
  }

  if (chainId === "none") {
    delete task.chainId;
  } else {
    let chain: Chain | undefined;
    try {
      chain = mergedChains()[chainId];
    } catch (err) {
      return { ok: false, error: "unknown-chain", message: (err as Error).message };
    }
    if (!chain) {
      return { ok: false, error: "unknown-chain", message: `unknown chain "${chainId}".` };
    }
    task.chainId = chain.id;
    if (!chain.flows.includes(task.flowId)) task.flowId = chain.flows[0];
  }

  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  return { ok: true, chainId: task.chainId ?? null, flowId: task.flowId };
}

export function cmdSetChain(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const chain = opts.chain as string | undefined;
  if (!chain) {
    console.error("--chain <chainId|none> is required");
    process.exit(1);
  }

  const result = setTaskChain(config, master, id, chain);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(
    JSON.stringify({ action: "chain-set", id, chainId: result.chainId, flowId: result.flowId }),
  );
}
