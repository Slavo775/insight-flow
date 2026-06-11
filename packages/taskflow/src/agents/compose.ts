// N88 — agent-module composer (spike).
//
// Proves the "agent = core + stacked modules" model: a `module` contributes
// prompt bullets to a named section; a `composed-agent` declares its core
// identity, ordered sections (some reserved/empty for modules), referenced
// module ids, and shared `@includes`. `composeAgent` resolves + dedups module
// refs, merges their bullets into the matching sections, and emits role MD.
//
// Text-only this round — no MCP/hook/skill contributions yet (see N88 ANALYSIS
// "What's next"). Source of truth is the JSON under modules/ and composed/.
import type { z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema } from "../core/schema/index.js";

import minimalDiff from "./modules/minimal-diff.json";
import scopeGuard from "./modules/scope-guard.json";
import taskImplement from "./composed/task-implement.json";
import taskReviewFix from "./composed/task-review-fix.json";

export type AgentModule = z.infer<typeof AgentModuleSchema>;
export type ComposedAgent = z.infer<typeof ComposedAgentSchema>;

// Validate authored data at load — malformed module/agent JSON fails fast.
export const MODULE_REGISTRY: Record<string, AgentModule> = Object.fromEntries(
  [minimalDiff, scopeGuard].map((m) => {
    const parsed = AgentModuleSchema.parse(m);
    return [parsed.id, parsed];
  }),
);

export const COMPOSED_AGENTS: Record<string, ComposedAgent> = Object.fromEntries(
  [taskImplement, taskReviewFix].map((a) => {
    const parsed = ComposedAgentSchema.parse(a);
    return [parsed.id, parsed];
  }),
);

export function listComposedAgents(): string[] {
  return Object.keys(COMPOSED_AGENTS);
}

/**
 * Compose a single agent definition into role Markdown.
 * - Resolves `def.modules` against the registry, deduping by id in declared order.
 * - Groups each module's bullets by its target section heading.
 * - Renders core identity → `@includes` → sections (role body + merged module
 *   bullets, skipping sections that end up empty) → trailing `@includes`.
 */
export function composeAgent(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const seen = new Set<string>();
  const moduleBulletsBySection = new Map<string, string[]>();
  for (const id of def.modules) {
    if (seen.has(id)) continue; // dedup repeated refs
    seen.add(id);
    const mod = registry[id];
    if (!mod) throw new Error(`Unknown module '${id}' referenced by agent '${def.id}'`);
    const { section, bullets } = mod.contribution;
    const list = moduleBulletsBySection.get(section) ?? [];
    list.push(...bullets);
    moduleBulletsBySection.set(section, list);
  }

  const out: string[] = [def.roleLine, "", def.intro, ""];
  for (const inc of def.includes) out.push(`@${inc}`);
  if (def.includes.length) out.push("");

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

  // Safety net: a module targeting a section the agent never declared.
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
