/**
 * N104 — pure status↔flow mapping. A project flow edge `{ from, to, on }`
 * reads "when the task reaches status `on`, agent `from` hands over to `to`".
 * A task sitting in a trigger status is therefore *at* its producing agent(s)
 * (`from`); the consuming agents (`to`) are the suggested next steps (N105).
 * Working statuses (in-progress, reviewing, …) carry no edges by design —
 * callers degrade gracefully. Derived entirely from the flow definition; no
 * hardcoded status table.
 */
export interface FlowEdge {
  from: string;
  to: string;
  on?: string;
}

/** Agents the task is currently "at": unique producers of edges triggered by `status`. */
export function currentFlowNodes(flow: FlowEdge[], status: string): string[] {
  const out: string[] = [];
  for (const edge of flow) {
    if (edge.on === status && !out.includes(edge.from)) out.push(edge.from);
  }
  return out;
}
