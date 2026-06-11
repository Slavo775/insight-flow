// N89 — agent-module composer v2 ("everything is a module").
//
// A composed agent is a single ordered list of registered module ids rendered
// as a pure sequence: each module emits one standalone block, in declared
// order. There is no heading-targeted merging — the author controls placement
// by ordering the list. Two module kinds:
//   - `section` — optional heading + pre-formatted body. Heading-only modules
//     open a section that following body-only modules continue; body-only
//     modules (e.g. shared `minimal-diff` bullets) render under the previous
//     module's heading.
//   - `include` — a verbatim `@<ref>` line. Consecutive include modules are
//     grouped without blank lines, matching hand-written role layout.
//
// Registry: shared modules use flat ids ("minimal-diff"); role-scoped modules
// are namespaced "<role>/<slug>" ("task-implement/input-contract").
//
// NOTE: the hand-written TASK_*_ROLE.md files remain the canonical shipped
// prompts. This JSON model + composer is a parallel implementation slated to
// become canonical in Round 3 (role migration); until then nothing consumes
// the composed output. No MCP/hook/skill contributions yet (Round 4).
import type { z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema } from "../core/schema/index.js";

import enforcement from "./modules/enforcement.json";
import protocol from "./modules/protocol.json";
import events from "./modules/events.json";
import minimalDiff from "./modules/minimal-diff.json";
import scopeGuard from "./modules/scope-guard.json";
import recorderDiscipline from "./modules/recorder-discipline.json";
import taskImplementModules from "./modules/roles/task-implement.json";
import taskReviewFixModules from "./modules/roles/task-review-fix.json";
import taskImplement from "./composed/task-implement.json";
import taskReviewFix from "./composed/task-review-fix.json";

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
    enforcement,
    protocol,
    events,
    minimalDiff,
    scopeGuard,
    recorderDiscipline,
    ...taskImplementModules,
    ...taskReviewFixModules,
  ],
  AgentModuleSchema,
);

export const COMPOSED_AGENTS: Record<string, ComposedAgent> = indexById(
  [taskImplement, taskReviewFix],
  ComposedAgentSchema,
);

export function listComposedAgents(): string[] {
  return Object.keys(COMPOSED_AGENTS);
}

/**
 * Compose a single agent definition into role Markdown.
 * Pure sequence: resolves `def.modules` against the registry (dedup by id,
 * declared order, unknown id throws before any output is produced) and emits
 * one block per module. Blocks are separated by a blank line, except
 * consecutive `include` blocks which stay adjacent.
 */
export function composeAgent(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const seen = new Set<string>();
  const blocks: { kind: AgentModule["kind"]; text: string }[] = [];
  for (const id of def.modules) {
    if (seen.has(id)) continue; // dedup repeated refs
    seen.add(id);
    const mod = registry[id];
    if (!mod) throw new Error(`Unknown module '${id}' referenced by agent '${def.id}'`);
    if (mod.kind === "include") {
      blocks.push({ kind: "include", text: `@${mod.ref}` });
    } else {
      const body = mod.body.trim();
      const lines: string[] = [];
      if (mod.heading) lines.push(mod.heading);
      if (mod.heading && body) lines.push("");
      if (body) lines.push(body);
      blocks.push({ kind: "section", text: lines.join("\n") });
    }
  }

  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) {
      const adjacentIncludes = b.kind === "include" && blocks[i - 1].kind === "include";
      out += adjacentIncludes ? "\n" : "\n\n";
    }
    out += b.text;
  });

  return out.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
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
