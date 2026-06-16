// N133 — resolve the status an agent's status-transition module (N128) sets.
// The `insight-flow advance` command reads this and writes through the
// flow-validated setter (N131), so a custom flow's agents emit that flow's
// custom statuses instead of hardcoded canonical literals.
import { mergedComposedAgents, mergedModuleRegistry } from "./user-registry.js";
import { resolveModules, type AgentModule } from "./compose.js";

type StatusTransition = Extract<AgentModule, { kind: "status-transition" }>;

/**
 * The status `agentId`'s status-transition module sets when advancing from
 * `fromStatus`. Prefers a module that names this agent and (optionally) guards
 * on `from`; falls back to any from-matching transition the agent carries. When
 * several modules match (e.g. overlapping `from` guards), the first in the
 * agent's declared module order wins. Returns undefined when the agent has no
 * matching transition module (or the registries fail to load).
 */
export function transitionTargetFor(agentId: string, fromStatus: string): string | undefined {
  let agents: Record<string, { id: string; title: string; modules: string[] }>;
  let registry: Record<string, AgentModule>;
  try {
    agents = mergedComposedAgents();
    registry = mergedModuleRegistry();
  } catch {
    return undefined;
  }
  const def = agents[agentId];
  if (!def) return undefined;

  const transitions = resolveModules(def, registry).filter(
    (m): m is StatusTransition => m.kind === "status-transition",
  );
  const guardOk = (m: StatusTransition): boolean => !m.from || m.from === fromStatus;
  const match =
    transitions.find((m) => m.agent === agentId && guardOk(m)) ?? transitions.find(guardOk);
  return match?.sets;
}
