// N125 — derive the full install plan for a flow: every mcp-server / hook /
// skill artifact contributed by the flow's agents PLUS its `install` list,
// deduped and flattened into an ordered, displayable plan. Read-only — the
// execution (writing .mcp.json / hooks / skills) is N126.
import {
  collectArtifacts,
  composeAgent,
  withFlowIdentity,
  type AgentArtifacts,
} from "./compose.js";
import { applyArtifacts, uninstallTarget, type EmitReport } from "./emit.js";
import { mergedComposedAgents, mergedModuleRegistry, mergedProjects } from "./user-registry.js";
import { deriveCommandName } from "../core/schema/index.js";
import { readSecrets } from "../core/secrets.js";
import { resolveTrigger, type AgentHandover } from "../core/flow-status.js";
import {
  scanPlaceholders,
  resolveInputs,
  RESERVED_PLACEHOLDERS,
  type InputMeta,
  type InputSpec,
} from "../core/inputs.js";
import type { Project } from "./project.js";

export interface InstallStep {
  kind: "mcp" | "hook" | "skill" | "command" | "subagent";
  /** Stable key for dedup (kind + this). */
  key: string;
  /** Human label for the modal. */
  label: string;
  /** Where the artifact is written. */
  target: string;
}

function emptyArtifacts(): AgentArtifacts {
  return { mcpServers: [], hooks: [], skills: [], commands: [], subagents: [] };
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
    list.push({
      to: e.to,
      ...(on ? { on } : {}),
      mode: e.handover.mode,
      ...(e.handover.when ? { when: e.handover.when } : {}),
    });
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
        // N153 — append `$ARGUMENTS` for parity with init's claude provider, so
        // overwriting a built-in source's command keeps slash-command arg handling.
        // N173 — stamp identity so a force-emitted flow source binds its flow too.
        body: `${withFlowIdentity(composeAgent(def, registry, flowHandovers), def.id)}\n\n$ARGUMENTS\n`,
        as: "command",
      });
    }
    out.mcpServers.push(...a.mcpServers);
    out.hooks.push(...a.hooks);
    out.skills.push(...a.skills);
    out.commands.push(...a.commands);
    out.subagents.push(...a.subagents);
  }
  return out;
}

/** The deduped, ordered install plan for a flow (mcp → hooks → skills). */
export function flowInstallPlan(flow: Project): InstallStep[] {
  return planFromArtifacts(flowArtifacts(flow));
}

/** The deduped, ordered install plan for any artifact set (mcp → hooks → skills → commands). */
export function planFromArtifacts(art: AgentArtifacts): InstallStep[] {
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
  // N190 — native subagents → `.claude/agents/<name>.md` (read by Claude + Cursor).
  for (const s of art.subagents) {
    push({
      kind: "subagent",
      key: s.name,
      label: `Subagent: ${s.name}`,
      target: `.claude/agents/${s.name}.md`,
    });
  }
  return steps;
}

/**
 * N165 — the `${VAR}` inputs a flow's install must collect, scanned from its
 * mcp-server configs and refined by any `inputs[]` metadata. Empty when no
 * placeholders are present.
 */
export function flowRequiredInputs(flow: Project): InputSpec[] {
  return inputsFromArtifacts(flowArtifacts(flow));
}

export function inputsFromArtifacts(art: AgentArtifacts): InputSpec[] {
  const scanned = new Set<string>();
  const meta: InputMeta[] = [];
  for (const m of art.mcpServers) {
    scanPlaceholders(m.config, scanned);
    if (m.inputs) meta.push(...m.inputs);
  }
  // N171 (review-fix) — also collect `${VAR}` from hook COMMANDS (config-like).
  // Deliberately NOT scanning skill content, command/prompt bodies, or hook SCRIPT
  // content: those are prose / JS that legitimately contain `${...}` (e.g.
  // task-git's PR-prefill examples → ${TITLE_ENCODED}), which would surface as
  // bogus required inputs.
  for (const h of art.hooks) scanPlaceholders(h.command, scanned);
  // Runtime/build vars (CLAUDE_PROJECT_DIR, ARGUMENTS, …) are never inputs.
  for (const r of RESERVED_PLACEHOLDERS) scanned.delete(r);
  return resolveInputs(scanned, meta);
}

// N174 — install targets. A flow was the only installable unit (N125); now an
// agent (its composed prompt + the artifacts its modules need) and a single
// artifact-bearing module are installable too. All three flow through the same
// emitter (emit.ts `applyArtifacts`) under a per-target manifest bucket
// (`targetBucketId`), so install/uninstall is reference-safe across targets.
export type TargetKind = "flow" | "agent" | "module";
export interface InstallTarget {
  kind: TargetKind;
  id: string;
}

/** Manifest bucket id for an install target (`flow:` / `agent:` / `module:`). */
export function targetBucketId(t: InstallTarget): string {
  return `${t.kind}:${t.id}`;
}

// Only these module kinds emit real artifacts (a `bundle` expands into them).
// `section` / `include` are pure role-prompt text and `status-transition` /
// `handover` are behavior-as-data — none install standalone (N174).
const INSTALLABLE_MODULE_KINDS = new Set(["mcp-server", "hook", "skill", "bundle", "subagent"]);

export function isInstallableModuleKind(kind: string): boolean {
  return INSTALLABLE_MODULE_KINDS.has(kind);
}

/** A target that has no installable artifacts (e.g. a `section` module). */
export class NotInstallableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotInstallableError";
  }
}

/** A target id that resolves to no flow/agent/module (→ 404 at the API). */
export class UnknownTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownTargetError";
  }
}

/** Human title for a target (modal header), or null when the target is unknown. */
export function targetTitle(t: InstallTarget): string | null {
  if (t.kind === "flow") return mergedProjects()[t.id]?.title ?? null;
  if (t.kind === "agent") return mergedComposedAgents()[t.id]?.title ?? null;
  return mergedModuleRegistry()[t.id]?.title ?? null;
}

/**
 * The artifacts an install target implies. A flow reuses `flowArtifacts`; an
 * agent contributes its module artifacts plus its own composed prompt as a
 * command/skill (force-emitted even when the agent didn't opt into
 * `command.install`, so "install this agent" always lands a runnable prompt); a
 * module contributes its single artifact (bundles expand). Unknown ids and
 * non-installable module kinds throw.
 */
export function targetArtifacts(t: InstallTarget): AgentArtifacts {
  if (t.kind === "flow") {
    const flow = mergedProjects()[t.id];
    if (!flow) throw new UnknownTargetError(`unknown flow '${t.id}'`);
    return flowArtifacts(flow);
  }
  const registry = mergedModuleRegistry();
  if (t.kind === "agent") {
    const def = mergedComposedAgents()[t.id];
    if (!def) throw new UnknownTargetError(`unknown agent '${t.id}'`);
    const out = collectArtifacts(def, registry);
    // N174 — collectArtifacts only emits the prompt when the agent opted into
    // command.install. Installing an agent directly always wants its prompt, so
    // force-emit it (mirroring the flow's force-emit body: identity-stamped +
    // `$ARGUMENTS` for slash-command parity) when none was produced.
    if (out.commands.length === 0) {
      const base = composeAgent(def, registry);
      if (base.trim()) {
        const name = deriveCommandName(def.id);
        const as = def.command?.as ?? "command";
        const prompt = withFlowIdentity(base, def.id);
        const body =
          as === "skill"
            ? `---\nname: ${name}\ndescription: ${JSON.stringify(def.description ?? def.title)}\n---\n\n${prompt}\n`
            : `${prompt}\n\n$ARGUMENTS\n`;
        out.commands.push({ name, body, as });
      }
    }
    return out;
  }
  // module
  const mod = registry[t.id];
  if (!mod) throw new UnknownTargetError(`unknown module '${t.id}'`);
  if (!isInstallableModuleKind(mod.kind)) {
    throw new NotInstallableError(
      `module '${t.id}' (kind '${mod.kind}') has no installable artifacts`,
    );
  }
  // collectArtifacts resolves the module (bundle-aware) and keeps only its
  // mcp-server / hook / skill contributions.
  return collectArtifacts({ id: targetBucketId(t), title: mod.title, modules: [t.id] }, registry);
}

/** The deduped, ordered install plan for any target. */
export function installPlan(t: InstallTarget): InstallStep[] {
  return planFromArtifacts(targetArtifacts(t));
}

/** The `${VAR}` inputs a target's install must collect. */
export function requiredInputs(t: InstallTarget): InputSpec[] {
  return inputsFromArtifacts(targetArtifacts(t));
}

// N188 — install/uninstall EXECUTION for any target. The dashboard's HTTP
// endpoint wraps these concerns with submitted-secret persistence, SSE
// progress, and conflict scrubbing; the composer MCP server has none of those,
// so this is the shared, transport-free core: compose the target's artifacts,
// resolve `${VAR}` inputs from provided values + the project's stored secrets,
// and apply them under the target's manifest bucket. Throws the same
// InstallConflictError / UnknownTargetError / NotInstallableError the endpoint
// surfaces (the caller maps them to its transport's error shape).

/** Resolve a target's `${VAR}` inputs from provided values, falling back to stored secrets. */
function resolveInstallValues(
  art: AgentArtifacts,
  projectRoot: string,
  provided: Record<string, string>,
): Record<string, string> {
  const stored = readSecrets(projectRoot);
  const values: Record<string, string> = {};
  for (const inp of inputsFromArtifacts(art)) {
    const v = provided[inp.name] ?? stored[inp.name];
    if (v !== undefined) values[inp.name] = v;
  }
  return values;
}

/**
 * Execute the install plan for a target over its manifest bucket. `force`
 * overwrites a conflicting `.mcp.json` entry (the prior value is snapshotted in
 * the manifest for the N172 uninstall-undo). Returns the per-target emit reports.
 */
export function executeInstall(
  t: InstallTarget,
  projectRoot: string,
  opts: { values?: Record<string, string>; force?: boolean } = {},
): EmitReport[] {
  const art = targetArtifacts(t); // throws Unknown/NotInstallable
  const values = resolveInstallValues(art, projectRoot, opts.values ?? {});
  return applyArtifacts(
    art,
    projectRoot,
    targetBucketId(t),
    { INSIGHT_FLOW_BIN: "insight-flow", ...values },
    { force: opts.force ?? false },
  );
}

/** Uninstall a target: remove its artifacts, reference-safe (N174), N172 undo-aware. */
export function executeUninstall(t: InstallTarget, projectRoot: string): EmitReport[] {
  return uninstallTarget(projectRoot, targetBucketId(t));
}
