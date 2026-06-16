// N125 — derive the full install plan for a flow: every mcp-server / hook /
// skill artifact contributed by the flow's agents PLUS its `install` list,
// deduped and flattened into an ordered, displayable plan. Read-only — the
// execution (writing .mcp.json / hooks / skills) is N126.
import { collectArtifacts, type AgentArtifacts } from "./compose.js";
import { mergedComposedAgents, mergedModuleRegistry } from "./user-registry.js";
import type { Project } from "./project.js";

export interface InstallStep {
  kind: "mcp" | "hook" | "skill";
  /** Stable key for dedup (kind + this). */
  key: string;
  /** Human label for the modal. */
  label: string;
  /** Where the artifact is written. */
  target: string;
}

function emptyArtifacts(): AgentArtifacts {
  return { mcpServers: [], hooks: [], skills: [] };
}

/** The artifacts a flow implies: its agents' contributions + its install list. */
export function flowArtifacts(flow: Project): AgentArtifacts {
  const agents = mergedComposedAgents();
  const registry = mergedModuleRegistry();
  const out = emptyArtifacts();
  const sources: { id: string; title: string; modules: string[] }[] = [
    // each agent of the flow
    ...flow.agents.map((id) => agents[id]).filter((d): d is NonNullable<typeof d> => Boolean(d)),
    // plus the project-level install list, as a synthetic "agent"
    { id: `${flow.id}:install`, title: "install", modules: flow.install },
  ];
  for (const def of sources) {
    const a = collectArtifacts(def, registry);
    out.mcpServers.push(...a.mcpServers);
    out.hooks.push(...a.hooks);
    out.skills.push(...a.skills);
  }
  return out;
}

/** The deduped, ordered install plan for a flow (mcp → hooks → skills). */
export function flowInstallPlan(flow: Project): InstallStep[] {
  const art = flowArtifacts(flow);
  const steps: InstallStep[] = [];
  const seen = new Set<string>();
  const push = (step: InstallStep): void => {
    if (seen.has(`${step.kind}:${step.key}`)) return;
    seen.add(`${step.kind}:${step.key}`);
    steps.push(step);
  };
  for (const m of art.mcpServers) {
    push({ kind: "mcp", key: m.name, label: `MCP server: ${m.name}`, target: ".mcp.json" });
  }
  for (const h of art.hooks) {
    const key = `${h.event}:${h.matcher ?? ""}:${h.command}:${h.timeout ?? ""}`;
    push({
      kind: "hook",
      key,
      label: `Hook: ${h.event}${h.matcher ? ` (${h.matcher})` : ""}`,
      target: ".claude/settings.json",
    });
  }
  for (const s of art.skills) {
    push({
      kind: "skill",
      key: s.name,
      label: `Skill: ${s.name}`,
      target: `.claude/skills/${s.name}/SKILL.md`,
    });
  }
  return steps;
}
