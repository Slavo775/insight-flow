// N110 — pure validation for editor-created flow edges. The editor enforces
// these before adding an edge; the schema re-checks the duplicate rule on
// save so hand-authored JSON gets the same guarantee.
import type { FlowEdge } from "./flow-status.js";

export function edgeKey(edge: FlowEdge): string {
  return `${edge.from}→${edge.to}:${edge.on ?? ""}`;
}

/**
 * Returns a human-readable rejection reason, or null when the candidate edge
 * may be added. Rules: no self-loops; no duplicate (from, to, on) triples.
 * Trigger legality is the schema's job (`on` is constrained to the status
 * enum); trigger-less edges are legal direct handoffs (the default flow
 * ships one: analyze → taskmaster).
 */
export function validateEdgeAddition(edges: FlowEdge[], candidate: FlowEdge): string | null {
  if (candidate.from === candidate.to) {
    return "self-loops are not allowed";
  }
  if (edges.some((e) => edgeKey(e) === edgeKey(candidate))) {
    return `duplicate edge: ${candidate.from} → ${candidate.to} on '${candidate.on ?? "handoff"}'`;
  }
  return null;
}
