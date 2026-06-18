// N125 — derive the full install plan for a flow: every mcp-server / hook /
// skill artifact contributed by the flow's agents PLUS its `install` list,
// deduped and flattened into an ordered, displayable plan. Read-only — the
// execution (writing .mcp.json / hooks / skills) is N126.
import { collectArtifacts, composeAgent, type AgentArtifacts } from "./compose.js";
import { mergedComposedAgents, mergedModuleRegistry } from "./user-registry.js";
import { deriveCommandName } from "../core/schema/index.js";
import { resolveTrigger, type AgentHandover } from "../core/flow-status.js";
import type { Project } from "./project.js";

export interface InstallStep {
  kind: "mcp" | "hook" | "skill" | "command";
  /** Stable key for dedup (kind + this). */
  key: string;
  /** Human label for the modal. */
  label: string;
  /** Where the artifact is written. */
  target: string;
}

function emptyArtifacts(): AgentArtifacts {
  return { mcpServers: [], hooks: [], skills: [], commands: [] };
}

/**
 * N149 — the flow's project-scoped edge handovers, grouped by source agent.
 * Custom-state triggers are resolved to canonical so the emitted prompt
 * references a real status.
 */
export function flowHandoversByAgent(flow: Project): Map<string, AgentHandover[]> {
  const out = new Map<string, AgentHandover[]>();
  for (const e of flow.flow) {
    if (!e.handover) continue;
    const on = resolveTrigger(e.on, flow.states);
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, ...(on ? { on } : {}), mode: e.handover.mode });
    out.set(e.from, list);
  }
  return out;
}

/** The artifacts a flow implies: its agents' contributions + its install list. */
export function flowArtifacts(flow: Project): AgentArtifacts {
  const agents = mergedComposedAgents();
  const registry = mergedModuleRegistry();
  const out = emptyArtifacts();
  // N149 — per-agent flow edge handovers, folded into each agent's command body.
  const handovers = flowHandoversByAgent(flow);
  const sources: { id: string; title: string; modules: string[] }[] = [
    // each agent of the flow
    ...flow.agents.map((id) => agents[id]).filter((d): d is NonNullable<typeof d> => Boolean(d)),
    // plus the project-level install list, as a synthetic "agent"
    { id: `${flow.id}:install`, title: "install", modules: flow.install },
  ];
  for (const def of sources) {
    const flowHandovers = handovers.get(def.id) ?? [];
    const a = collectArtifacts(def, registry, flowHandovers);
    // N149 — a handover SOURCE that isn't command-installed (notably a built-in
    // agent like Taskmaster, which has no `command.install`) still needs its
    // per-flow `## Handover` section delivered. Emit/overwrite its command with
    // the flow-composed prompt so installing the flow rewrites the agent's
    // command file (`.claude/commands/<name>.md`). `collectArtifacts` already
    // covers command-installed agents (their merged section comes via
    // `extraHandovers`), so only force-emit when nothing was produced.
    if (flowHandovers.length && a.commands.length === 0) {
      a.commands.push({
        name: deriveCommandName(def.id),
        body: composeAgent(def, registry, flowHandovers),
        as: "command",
      });
    }
    out.mcpServers.push(...a.mcpServers);
    out.hooks.push(...a.hooks);
    out.skills.push(...a.skills);
    out.commands.push(...a.commands);
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
  // N138 — an agent's own composed prompt installed as a runnable command/skill.
  for (const c of art.commands) {
    push({
      kind: "command",
      key: c.name,
      label: `${c.as === "skill" ? "Skill" : "Command"}: /${c.name}`,
      target:
        c.as === "skill" ? `.claude/skills/${c.name}/SKILL.md` : `.claude/commands/${c.name}.md`,
    });
  }
  return steps;
}
