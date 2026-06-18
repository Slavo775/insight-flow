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
  /**
   * N147 — edge-level handover (project-scoped). Present ⇒ this relation is a
   * handover (source agent hands to `to`); independent of `on`. `mode`: `auto`
   * chains the next command in-session, `gated` stops for explicit human
   * go-ahead. Consumed at flow-install time (N149) to build the agent's section.
   */
  handover?: { mode: "auto" | "gated" };
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

// N142/N149 — a handover a source agent makes to a target. After N147/N150 the
// authoritative source is the flow edge's own `handover` field (project-scoped);
// this shape is reused by install-time composition (N149) to render the section.
export interface AgentHandover {
  to: string;
  on?: string;
  mode: "auto" | "gated";
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
