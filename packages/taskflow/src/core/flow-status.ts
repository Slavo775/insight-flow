/**
 * N104 — pure status↔flow mapping. A project flow edge `{ from, to, on }`
 * reads "when the task reaches status `on`, agent `from` hands over to `to`".
 * A task sitting in a trigger status is therefore *at* its producing agent(s)
 * (`from`); the consuming agents (`to`) are the suggested next steps (N105).
 * Working statuses (in-progress, reviewing, …) carry no edges by design —
 * callers degrade gracefully. Derived entirely from the flow definition; no
 * hardcoded status table.
 *
 * N112 — flows may define custom states: display aliases that map onto
 * exactly one canonical status. `resolveTrigger` collapses an edge's trigger
 * to its canonical status, so the map and the suggestions honor aliases while
 * tasks keep storing canonical statuses only.
 */
export interface FlowEdge {
  from: string;
  to: string;
  on?: string;
}

export interface FlowStateDef {
  id: string;
  title: string;
  color?: string;
  mapsTo: string;
}

/** The canonical status behind a trigger: a custom state's mapsTo, else itself. */
export function resolveTrigger(
  on: string | undefined,
  states?: FlowStateDef[],
): string | undefined {
  if (!on) return undefined;
  return states?.find((s) => s.id === on)?.mapsTo ?? on;
}

/** Agents the task is currently "at": unique producers of edges triggered by `status`. */
export function currentFlowNodes(
  flow: FlowEdge[],
  status: string,
  states?: FlowStateDef[],
): string[] {
  const out: string[] = [];
  for (const edge of flow) {
    if (resolveTrigger(edge.on, states) === status && !out.includes(edge.from)) {
      out.push(edge.from);
    }
  }
  return out;
}

// N142/N144 — a handover an agent declares (the authoritative, agent-owned
// next step). The flow diagram is non-binding: an edge is "backed" when the
// producing agent (`from`) actually declares a handover matching it, and
// "orphan" otherwise (the diagram drew an edge no agent honors).
export interface AgentHandover {
  to: string;
  on?: string;
  mode: "auto" | "gated";
}

/**
 * The handover on `edge.from` that backs this edge (same `to` and `on`), if any.
 * N146 — the edge's trigger may be a flow custom-state id (e.g. `test-ready`);
 * a handover's `on` is always canonical (e.g. `ready`). Resolve the edge trigger
 * through the flow's `states` (via `resolveTrigger`) before comparing, so an
 * aliased edge still matches its backing handover. Omitting `states` keeps the
 * pre-N146 raw-compare behavior (back-compat).
 */
export function edgeHandover(
  edge: FlowEdge,
  handoversByAgent: Record<string, AgentHandover[]>,
  states?: FlowStateDef[],
): AgentHandover | undefined {
  const list = handoversByAgent[edge.from] ?? [];
  const trigger = resolveTrigger(edge.on, states) ?? "";
  return list.find((h) => h.to === edge.to && (h.on ?? "") === trigger);
}

/** True when the diagram edge is backed by a declared agent handover (N144). */
export function isEdgeBackedByHandover(
  edge: FlowEdge,
  handoversByAgent: Record<string, AgentHandover[]>,
  states?: FlowStateDef[],
): boolean {
  return edgeHandover(edge, handoversByAgent, states) !== undefined;
}

/**
 * N146 — three-way edge classification for the flow diagram:
 *  - `backed`         — a declared handover on the source agent matches the edge.
 *  - `builtin-source` — no match, but the source is a built-in/locked agent
 *                       whose handovers can't be edited, so the edge can never be
 *                       backed by the user. Informational, not an error.
 *  - `orphan`         — no match and the source is a custom agent the user CAN
 *                       add a handover to. A genuine, fixable orphan.
 */
export type EdgeBacking = "backed" | "builtin-source" | "orphan";

export function classifyEdge(
  edge: FlowEdge,
  handoversByAgent: Record<string, AgentHandover[]>,
  builtinAgents: ReadonlySet<string>,
  states?: FlowStateDef[],
): { backing: EdgeBacking; handover?: AgentHandover } {
  const handover = edgeHandover(edge, handoversByAgent, states);
  if (handover) return { backing: "backed", handover };
  if (builtinAgents.has(edge.from)) return { backing: "builtin-source" };
  return { backing: "orphan" };
}

export interface NextStep {
  agentId: string;
  on: string;
  /** Display label: the custom state's title when the trigger is an alias. */
  label: string;
}

/**
 * N105 — suggested next agents: unique targets of edges triggered by `status`,
 * in flow order. Multiple branches are first-class (e.g. `approved` →
 * task-human-review and task-git). Empty for working/terminal statuses —
 * suggestions only; the next/next-review pickers stay canonical.
 */
export function suggestNextSteps(
  flow: FlowEdge[],
  status: string,
  states?: FlowStateDef[],
): NextStep[] {
  const out: NextStep[] = [];
  for (const edge of flow) {
    if (!edge.on || resolveTrigger(edge.on, states) !== status) continue;
    if (out.some((s) => s.agentId === edge.to)) continue;
    const state = states?.find((s) => s.id === edge.on);
    out.push({ agentId: edge.to, on: edge.on, label: state?.title ?? edge.on });
  }
  return out;
}
