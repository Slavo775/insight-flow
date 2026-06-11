// N90 — agent-module composer (JSON canonical).
//
// The JSON under modules/ and composed/ is the source of truth for the nine
// shipped role prompts. The committed *_ROLE.md files at the repo root are
// generated from it via `insight-flow prompt-build --compose --apply` and must
// stay byte-identical to the composer output (enforced by test/compose.test.mjs).
// Edit the JSON, re-run compose-apply, commit both — never hand-edit role MD.
//
// A composed agent is a single ordered list of registered module ids rendered
// as a pure sequence: each module emits one standalone block, in declared
// order. Two module kinds:
//   - `section` — optional heading + body. Bodies are emitted exactly as
//     authored (no trimming/squeezing) so generated files can be byte-exact;
//     a trailing "\n" in a body encodes an extra blank line before the next
//     block. A body-only section module directly following a section block
//     joins it without a blank line (list/prose continuation).
//   - `include` — a verbatim `@<ref>` line. Consecutive include modules are
//     grouped without blank lines.
//
// Registry: shared modules use flat ids ("enforcement"); role-scoped modules
// are namespaced "<role>/<slug>" ("task-implement/input-contract").
// No MCP/hook/skill contributions yet (Round 4).
import type { z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema } from "../core/schema/index.js";

import enforcement from "./modules/enforcement.json";
import protocol from "./modules/protocol.json";
import events from "./modules/events.json";
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
import taskAnalyze from "./composed/task-analyze.json";
import taskmaster from "./composed/taskmaster.json";
import taskmasterChange from "./composed/taskmaster-change.json";
import taskImplement from "./composed/task-implement.json";
import taskReview from "./composed/task-review.json";
import taskReviewFix from "./composed/task-review-fix.json";
import taskHumanReview from "./composed/task-human-review.json";
import taskIncident from "./composed/task-incident.json";
import taskRequestChanges from "./composed/task-request-changes.json";

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
    ...taskAnalyzeModules,
    ...taskmasterModules,
    ...taskmasterChangeModules,
    ...taskImplementModules,
    ...taskReviewModules,
    ...taskReviewFixModules,
    ...taskHumanReviewModules,
    ...taskIncidentModules,
    ...taskRequestChangesModules,
  ],
  AgentModuleSchema,
);

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
  ],
  ComposedAgentSchema,
);

export function listComposedAgents(): string[] {
  return Object.keys(COMPOSED_AGENTS);
}

/**
 * Compose a single agent definition into role Markdown.
 * Pure sequence: resolves `def.modules` against the registry (dedup by id,
 * declared order, unknown id throws before any output is produced) and emits
 * one block per module, byte-exactly. Separators: consecutive `include`
 * blocks join with "\n"; a body-only `section` block after a section joins
 * with "\n" (continuation); everything else joins with "\n\n".
 */
export function composeAgent(
  def: ComposedAgent,
  registry: Record<string, AgentModule> = MODULE_REGISTRY,
): string {
  const seen = new Set<string>();
  const mods: AgentModule[] = [];
  for (const id of def.modules) {
    if (seen.has(id)) continue; // dedup repeated refs
    seen.add(id);
    const mod = registry[id];
    if (!mod) throw new Error(`Unknown module '${id}' referenced by agent '${def.id}'`);
    mods.push(mod);
  }

  let out = "";
  mods.forEach((mod, i) => {
    if (i > 0) {
      const prev = mods[i - 1];
      if (prev.kind === "include" && mod.kind === "include") out += "\n";
      else if (prev.kind === "section" && mod.kind === "section" && !mod.heading) out += "\n";
      else out += "\n\n";
    }
    if (mod.kind === "include") {
      out += `@${mod.ref}`;
    } else if (mod.heading && mod.body.length) {
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
