// N88 — agent-module composer (spike).
//
// Proves the "agent = core + stacked modules" model. A module's contribution is
// one of two kinds:
//   - `prompt`  — bullets merged into a named section (e.g. minimal-diff → NEVER);
//   - `include` — a verbatim `@<ref>` reference emitted among the top includes
//                 (e.g. enforcement → @AGENT_ENFORCEMENT.md).
// A `composed-agent` declares its core identity, ordered sections (some
// reserved/empty for modules), referenced module ids, and any literal includes.
// `composeAgent` resolves + dedups module refs, emits include-modules in the
// includes region, merges prompt-modules into their sections, and returns role MD.
//
// No MCP/hook/skill contributions yet (see N88 ANALYSIS "What's next").
import type { z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema } from "../core/schema/index.js";

import enforcement from "./modules/enforcement.json";
import protocol from "./modules/protocol.json";
import minimalDiff from "./modules/minimal-diff.json";
import scopeGuard from "./modules/scope-guard.json";
import taskImplement from "./composed/task-implement.json";
import taskReviewFix from "./composed/task-review-fix.json";

export type AgentModule = z.infer<typeof AgentModuleSchema>;
export type ComposedAgent = z.infer<typeof ComposedAgentSchema>;

// Validate authored data at load and key it by id. Malformed JSON fails fast.
function indexById<T extends { id: string }>(
  items: unknown[],
  schema: z.ZodType<T>,
): Record<string, T> {
  return Object.fromEntries(
    items.map((item) => {
      const parsed = schema.parse(item);
      return [parsed.id, parsed];
    }),
  ) as Record<string, T>;
}

export const MODULE_REGISTRY: Record<string, AgentModule> = indexById(
  [enforcement, protocol, minimalDiff, scopeGuard],
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
 * - Resolves `def.modules` against the registry, deduping by id in declared order.
 * - `include` modules contribute a verbatim `@<ref>` line in the includes region
 *   (deduped); `prompt` modules contribute bullets merged into their section.
 * - Renders core identity → includes → sections (role body + merged module
 *   bullets, skipping empties) → trailing includes.
 */
export function composeAgent(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const seen = new Set<string>();
  const includeRefs: string[] = [...def.includes];
  const moduleBulletsBySection = new Map<string, string[]>();
  for (const id of def.modules) {
    if (seen.has(id)) continue; // dedup repeated refs
    seen.add(id);
    const mod = registry[id];
    if (!mod) throw new Error(`Unknown module '${id}' referenced by agent '${def.id}'`);
    const c = mod.contribution;
    if (c.kind === "include") {
      if (!includeRefs.includes(c.ref)) includeRefs.push(c.ref);
    } else {
      const list = moduleBulletsBySection.get(c.section) ?? [];
      list.push(...c.bullets);
      moduleBulletsBySection.set(c.section, list);
    }
  }

  const out: string[] = [def.roleLine, "", def.intro, ""];
  for (const ref of includeRefs) out.push(`@${ref}`);
  if (includeRefs.length) out.push("");

  const rendered = new Set<string>();
  for (const section of def.sections) {
    const moduleBullets = moduleBulletsBySection.get(section.heading) ?? [];
    const body = section.body.trim();
    if (!body && moduleBullets.length === 0) continue; // reserved-but-unused → skip
    const lines: string[] = [];
    if (body) lines.push(body);
    for (const b of moduleBullets) lines.push(`- ${b}`);
    out.push(section.heading, "", lines.join("\n"), "");
    rendered.add(section.heading);
  }

  // Safety net: a prompt-module targeting a section the agent never declared.
  for (const [heading, bullets] of moduleBulletsBySection) {
    if (rendered.has(heading)) continue;
    out.push(heading, "", bullets.map((b) => `- ${b}`).join("\n"), "");
  }

  for (const inc of def.trailingIncludes) out.push(`@${inc}`);

  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
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
