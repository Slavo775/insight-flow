// N267 — pure chain (flow-of-flows) helpers. A chain links existing flows: a
// link leaves a TERMINAL status of flow `from` and enters flow `to` (at
// `ready`). Shared by the registry loader, the CRUD API, `chain-advance`, and
// the status writer's hint (and later the dashboard, N268/N269). No fs.
import { deriveCommandName, type Chain, type ChainLink } from "./schema/index.js";

/** Just enough of a flow for chain checks (a Project satisfies it). */
export interface ChainFlow {
  statuses?: { id: string; terminal?: boolean }[];
  entryAgents?: string[];
}

/** Is `status` a declared terminal (`terminal: true`) status of the flow? */
export function isTerminalOf(flow: ChainFlow | undefined, status: string): boolean {
  return (flow?.statuses ?? []).some((s) => s.id === status && s.terminal === true);
}

/** The chain's links leaving flow `flowId` at status `status`, in chain order. */
export function chainLinksFrom(chain: Chain, flowId: string, status: string): ChainLink[] {
  return chain.links.filter((l) => l.from === flowId && l.on === status);
}

/** The flow's first entry agent and its slash command; undefined when it has none. */
export function chainEntryCommand(
  flow: ChainFlow | undefined,
): { agentId: string; command: string } | undefined {
  const agentId = flow?.entryAgents?.[0];
  return agentId ? { agentId, command: `/${deriveCommandName(agentId)}` } : undefined;
}

/**
 * Cross-registry checks the schema can't do: every flow exists, every link
 * leaves a terminal of its `from` flow, and every `to` flow has an entry agent
 * (else the handover can't name a command). Null when the chain is valid.
 */
export function chainReferenceError(chain: Chain, flows: Record<string, ChainFlow>): string | null {
  for (const id of chain.flows) {
    if (!flows[id]) return `references unknown flow '${id}'`;
  }
  for (const link of chain.links) {
    const label = `link ${link.from} (${link.on}) → ${link.to}`;
    if (!isTerminalOf(flows[link.from], link.on)) {
      return `${label}: '${link.on}' is not a terminal status of flow '${link.from}'`;
    }
    if (!chainEntryCommand(flows[link.to])) {
      return `${label}: flow '${link.to}' has no entry agent`;
    }
  }
  return null;
}
