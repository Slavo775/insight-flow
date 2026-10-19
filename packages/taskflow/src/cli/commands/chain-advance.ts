// N267 — `insight-flow chain-advance --id <id> [--to <flowId>] [--by <agent>]`:
// at a terminal status of its current flow, move a chained task into the next
// flow of its chain and set `ready` — one write, recorded in statusHistory with
// the new `flowId`. `ready` is written directly, exactly like `create` does, so
// a flow that doesn't declare `ready` can still be chained into.
import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import type { Chain, ChainLink } from "../../core/schema/index.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, now, resolveId } from "../../core/storage.js";
import { chainEntryCommand, chainLinksFrom, isTerminalOf } from "../../core/chain.js";
import { mergedChains, mergedProjects } from "../../agents/user-registry.js";
import type { Project } from "../../agents/project.js";

export type ChainAdvanceFailure =
  | "not-found"
  | "no-chain"
  | "unknown-chain"
  | "unknown-flow"
  | "not-terminal"
  | "no-link"
  | "ambiguous"
  | "bad-target";

export interface ChainAdvanceResult {
  ok: boolean;
  error?: ChainAdvanceFailure;
  message?: string;
  from?: string;
  to?: string;
  mode?: ChainLink["mode"];
  next?: { agentId: string; command: string };
  /** Links the task could take (on `ambiguous` / `bad-target`). */
  candidates?: ChainLink[];
}

function describe(links: ChainLink[]): string {
  return links
    .map((l) => `${l.to}${l.when ? ` (when: ${JSON.stringify(l.when)})` : ""}`)
    .join(", ");
}

/** Shared by the CLI and (N269) the dashboard endpoint. */
export function chainAdvanceTask(
  config: TaskflowConfig,
  master: MasterFile,
  id: string,
  opts: { to?: string; by: string },
): ChainAdvanceResult {
  let loaded;
  try {
    loaded = jsonFileStorage.loadTaskById(config, master, id);
  } catch {
    return { ok: false, error: "not-found", message: `task "${id}" not found` };
  }
  const { task, shard, shardFile } = loaded;

  if (!task.chainId) {
    return {
      ok: false,
      error: "no-chain",
      message: `${id} has no chain — bind one with \`insight-flow set-chain\`.`,
    };
  }
  let flows: Record<string, Project>;
  let chain: Chain | undefined;
  try {
    flows = mergedProjects();
    chain = mergedChains(undefined, flows)[task.chainId];
  } catch (err) {
    return { ok: false, error: "unknown-chain", message: (err as Error).message };
  }
  if (!chain) {
    return { ok: false, error: "unknown-chain", message: `unknown chain "${task.chainId}".` };
  }

  const from = task.flowId;
  if (!Object.hasOwn(flows, from)) {
    return {
      ok: false,
      error: "unknown-flow",
      message: `${id} is in flow '${from}', which no longer exists — restore it or rebind the task.`,
    };
  }
  if (!isTerminalOf(flows[from], task.status)) {
    return {
      ok: false,
      error: "not-terminal",
      message: `${id} is "${task.status}" — chain-advance runs only at a terminal status of flow '${from}'.`,
    };
  }
  const links = chainLinksFrom(chain, from, task.status);
  if (!links.length) {
    return {
      ok: false,
      error: "no-link",
      message: `chain '${chain.id}' has no link from flow '${from}' at '${task.status}'.`,
    };
  }
  let link: ChainLink | undefined = links[0];
  if (opts.to) {
    link = links.find((l) => l.to === opts.to);
    if (!link) {
      return {
        ok: false,
        error: "bad-target",
        message: `no link to '${opts.to}' from '${from}' at '${task.status}' — candidates: ${describe(links)}.`,
        candidates: links,
      };
    }
  } else if (links.length > 1) {
    return {
      ok: false,
      error: "ambiguous",
      message: `several next flows — pass --to: ${describe(links)}.`,
      candidates: links,
    };
  }

  task.flowId = link.to;
  task.status = "ready";
  task.statusHistory.push({ status: "ready", at: now(), by: opts.by, flowId: link.to });
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  return {
    ok: true,
    from,
    to: link.to,
    mode: link.mode,
    next: chainEntryCommand(flows[link.to]),
  };
}

export function cmdChainAdvance(
  config: TaskflowConfig,
  master: MasterFile,
  opts: ParsedArgs,
): void {
  const id = resolveId(master, opts.id as string);
  const result = chainAdvanceTask(config, master, id, {
    to: opts.to as string | undefined,
    by: (opts.by as string) || "chain",
  });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      action: "chain-advanced",
      id,
      from: result.from,
      to: result.to,
      mode: result.mode,
      next: result.next,
    }),
  );
}
