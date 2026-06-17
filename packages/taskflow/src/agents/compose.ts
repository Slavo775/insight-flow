// N90 — agent-module composer (JSON canonical).
//
// The JSON under modules/ and composed/ is the source of truth for the nine
// shipped role prompts. The committed *_ROLE.md files at the repo root are
// generated from it via `insight-flow prompt-build --compose --apply` and must
// stay byte-identical to the composer output (enforced by test/compose.test.mjs).
// Edit the JSON, re-run compose-apply, commit both — never hand-edit role MD.
//
// A composed agent is a single ordered list of registered module ids. Text
// kinds render as a pure sequence — each module emits one standalone block,
// in declared order:
//   - `section` — optional heading + body. Bodies are emitted exactly as
//     authored (no trimming/squeezing) so generated files can be byte-exact;
//     a trailing "\n" in a body encodes an extra blank line before the next
//     block. A body-only section module after a body-carrying section joins
//     it without a blank line (list continuation); after a heading-only
//     section it opens the section with a blank line.
//   - `include` — a verbatim `@<ref>` line. Consecutive include modules are
//     grouped without blank lines.
// Non-text kinds (`mcp-server` | `hook` | `skill`, N92) are ignored by MD
// composition and collected by `collectArtifacts` for agents/emit.ts.
//
// Registry: shared modules use flat ids ("enforcement"); role-scoped modules
// are namespaced "<role>/<slug>" ("task-implement/input-contract");
// integration modules "<integration>/<slug>" ("testing/hook").
import type { z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema, deriveCommandName } from "../core/schema/index.js";

import security from "./modules/security.json";
import enforcement from "./modules/enforcement.json";
import protocol from "./modules/protocol.json";
import notify from "./modules/notify.json";
import config from "./modules/config.json";
import actions from "./modules/actions.json";
import minimalDiff from "./modules/minimal-diff.json";
import scopeGuard from "./modules/scope-guard.json";
import recorderDiscipline from "./modules/recorder-discipline.json";
import taskAnalyzeModules from "./modules/roles/task-analyze.json";
import taskmasterModules from "./modules/roles/taskmaster.json";
import taskmasterChangeModules from "./modules/roles/taskmaster-change.json";
import taskImplementModules from "./modules/roles/task-implement.json";
import taskReviewModules from "./modules/roles/task-review.json";
import taskReviewFixModules from "./modules/roles/task-review-fix.json";
import taskHumanReviewModules from "./modules/roles/task-human-review.json";
import taskIncidentModules from "./modules/roles/task-incident.json";
import taskRequestChangesModules from "./modules/roles/task-request-changes.json";
import taskGitModules from "./modules/roles/task-git.json";
import testingModules from "./modules/integrations/testing.json";
import activityModules from "./modules/integrations/activity.json";
import taskAnalyze from "./composed/task-analyze.json";
import taskmaster from "./composed/taskmaster.json";
import taskmasterChange from "./composed/taskmaster-change.json";
import taskImplement from "./composed/task-implement.json";
import taskReview from "./composed/task-review.json";
import taskReviewFix from "./composed/task-review-fix.json";
import taskHumanReview from "./composed/task-human-review.json";
import taskIncident from "./composed/task-incident.json";
import taskRequestChanges from "./composed/task-request-changes.json";
import taskGit from "./composed/task-git.json";

export type AgentModule = z.infer<typeof AgentModuleSchema>;
export type ComposedAgent = z.infer<typeof ComposedAgentSchema>;

// Validate authored data at load and key it by id. Malformed JSON fails fast;
// duplicate ids throw rather than silently last-winning.
export function indexById<T extends { id: string }>(
  items: unknown[],
  schema: z.ZodType<T>,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    const parsed = schema.parse(item);
    if (out[parsed.id]) throw new Error(`Duplicate id '${parsed.id}' in registry`);
    out[parsed.id] = parsed;
  }
  return out;
}

export const MODULE_REGISTRY: Record<string, AgentModule> = indexById(
  [
    security,
    enforcement,
    protocol,
    notify,
    config,
    actions,
    minimalDiff,
    scopeGuard,
    recorderDiscipline,
    ...taskAnalyzeModules,
    ...taskmasterModules,
    ...taskmasterChangeModules,
    ...taskImplementModules,
    ...taskReviewModules,
    ...taskReviewFixModules,
    ...taskHumanReviewModules,
    ...taskIncidentModules,
    ...taskRequestChangesModules,
    ...taskGitModules,
    ...testingModules,
    ...activityModules,
  ],
  AgentModuleSchema,
);

// N96: the N94-era ACTIVITY_AGENT pseudo-agent dissolved into the project
// layer — the lifecycle hooks are installed via project/default.json's
// `install` list (see agents/project.ts).

export const COMPOSED_AGENTS: Record<string, ComposedAgent> = indexById(
  [
    taskAnalyze,
    taskmaster,
    taskmasterChange,
    taskImplement,
    taskReview,
    taskReviewFix,
    taskHumanReview,
    taskIncident,
    taskRequestChanges,
    taskGit,
  ],
  ComposedAgentSchema,
);

export function listComposedAgents(): string[] {
  return Object.keys(COMPOSED_AGENTS);
}

// Resolve a def's module ids against the registry: dedup by id (first wins),
// declared order, unknown id throws before any output is produced. Bundle
// modules (N95) expand recursively in place — their children splice at the
// bundle's declared position; the bundle itself contributes nothing. A bundle
// reachable from its own expansion throws (cycle guard).
export function resolveModules(
  def: ComposedAgent,
  registry: Record<string, AgentModule>,
): AgentModule[] {
  const seen = new Set<string>();
  const mods: AgentModule[] = [];
  const expand = (ids: readonly string[], path: readonly string[]): void => {
    for (const id of ids) {
      const mod = registry[id];
      if (!mod) throw new Error(`Unknown module '${id}' referenced by agent '${def.id}'`);
      if (mod.kind === "bundle") {
        if (path.includes(id)) {
          throw new Error(`Bundle cycle: ${[...path, id].join(" → ")}`);
        }
        if (seen.has(id)) continue; // dedup repeated bundle refs
        seen.add(id);
        expand(mod.modules, [...path, id]);
      } else {
        if (seen.has(id)) continue; // dedup repeated refs
        seen.add(id);
        mods.push(mod);
      }
    }
  };
  expand(def.modules, []);
  return mods;
}

/** The non-text contributions of a composed agent, in declared order. */
export interface AgentArtifacts {
  mcpServers: { name: string; config: Record<string, unknown> }[];
  hooks: {
    event: string;
    matcher?: string;
    command: string;
    timeout?: number;
    script?: { name: string; content: string };
  }[];
  skills: { name: string; content: string }[];
  // N138 — the agent's own composed prompt installed as a runnable slash command
  // (`.claude/commands/<name>.md`) or skill (`.claude/skills/<name>/SKILL.md`).
  commands: { name: string; body: string; as: "command" | "skill" }[];
}

/**
 * Collect an agent's `mcp-server` / `hook` / `skill` contributions (N92) plus,
 * when opted in (N138), its own composed prompt as an installable command/skill.
 */
export function collectArtifacts(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): AgentArtifacts {
  const out: AgentArtifacts = { mcpServers: [], hooks: [], skills: [], commands: [] };
  for (const mod of resolveModules(def, registry)) {
    if (mod.kind === "mcp-server") out.mcpServers.push({ name: mod.name, config: mod.config });
    else if (mod.kind === "hook")
      out.hooks.push({
        event: mod.event,
        matcher: mod.matcher,
        command: mod.command,
        timeout: mod.timeout,
        script: mod.script,
      });
    else if (mod.kind === "skill") out.skills.push({ name: mod.name, content: mod.content });
  }
  // N138 — installable command/skill carrying the agent's composed prompt. Skills
  // require frontmatter (name + description); commands take the prompt verbatim.
  if (def.command?.install) {
    const name = deriveCommandName(def.id);
    const prompt = composeAgent(def, registry);
    const body =
      def.command.as === "skill"
        ? `---\nname: ${name}\ndescription: ${def.description ?? def.title}\n---\n\n${prompt}`
        : prompt;
    out.commands.push({ name, body, as: def.command.as });
  }
  return out;
}

/**
 * Compose a single agent definition into role Markdown.
 * Pure sequence over the text kinds (`section` | `include`); non-text kinds
 * are skipped here and surfaced via `collectArtifacts`. Separators:
 * consecutive `include` blocks join with "\n"; a body-only `section` block
 * after a body-carrying section joins with "\n" (continuation) and after a
 * heading-only section with "\n\n" (opens it); everything else "\n\n".
 */
// N133 — a status-transition module (N128) renders as an instruction section:
// the agent advances the task through its OWN flow via the flow-validated
// setter (`insight-flow advance`, which reads this module and writes through
// N131), instead of a hardcoded canonical literal. Shipped agents carry no
// status-transition modules, so default role Markdown is byte-identical.
function transitionSection(
  m: Extract<AgentModule, { kind: "status-transition" }>,
): Extract<AgentModule, { kind: "section" }> {
  const from = m.from ? ` (only from \`${m.from}\`)` : "";
  return {
    id: m.id,
    title: m.title,
    source: m.source,
    kind: "section",
    heading: "## Advance the flow",
    body:
      `When your work is complete, advance the task through its flow:\n\n` +
      `\`insight-flow advance --id <task-id> --agent ${m.agent}\`\n\n` +
      `This sets status \`${m.sets}\`${from}, validated against the task's flow.`,
  };
}

export function composeAgent(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const mods = resolveModules(def, registry)
    .map((m) => (m.kind === "status-transition" ? transitionSection(m) : m))
    .filter(
      (m): m is Extract<AgentModule, { kind: "section" | "include" }> =>
        m.kind === "section" || m.kind === "include",
    );

  let out = "";
  mods.forEach((mod, i) => {
    if (i > 0) {
      const prev = mods[i - 1];
      if (prev.kind === "include" && mod.kind === "include") out += "\n";
      else if (prev.kind === "section" && mod.kind === "section" && !mod.heading) {
        // Body-only continuation: a heading-only predecessor opens the section
        // (blank line after the heading, house style); a predecessor with body
        // is continued directly (no blank line mid-list).
        out += prev.heading && !prev.body?.length ? "\n\n" : "\n";
      } else out += "\n\n";
    }
    if (mod.kind === "include") {
      out += `@${mod.ref}`;
    } else if (mod.heading && mod.body?.length) {
      out += mod.heading + "\n\n" + mod.body;
    } else {
      out += mod.heading || mod.body;
    }
  });

  return out.replace(/\n+$/, "") + "\n";
}

export function composeAgentById(
  id: string,
  agents: Record<string, ComposedAgent> = COMPOSED_AGENTS,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const def = agents[id];
  if (!def) {
    throw new Error(
      `Unknown composed agent '${id}'. Known: ${Object.keys(agents).join(", ") || "(none)"}`,
    );
  }
  return composeAgent(def, registry);
}
