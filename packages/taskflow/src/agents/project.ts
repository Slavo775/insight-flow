// N96 — project layer loader (the atomic-design top tier).
//
// The project definition describes which agents a project uses, how work
// flows between them (status/verdict-triggered edges), and what it installs
// globally (module/bundle ids applied via the artifact emitter under the
// project's manifest bucket). DESCRIPTIVE this iteration — the flow
// visualizes/audits behavior still enforced by the status machine, the
// next* pickers, and the role prompts; a later iteration makes those read
// from this data (same source-of-truth flip the composer line did for MD).
import { ProjectSchema } from "../core/schema/index.js";
import type { z } from "zod";
import {
  COMPOSED_AGENTS,
  MODULE_REGISTRY,
  collectArtifacts,
  type AgentArtifacts,
} from "./compose.js";
import defaultProject from "./project/default.json";
import authoringProject from "./project/authoring.json";

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Manifest bucket id for a project's global installs. N174 — a flow is one of
 * the three install targets (`flow:` / `agent:` / `module:`), so its bucket is
 * keyed `flow:<id>` (was `project:<id>` pre-N174; the emitter migrates the old
 * key on next apply). Kept as a named helper so existing call sites (init's
 * lifecycle-hook install, the dashboard) read clearly.
 */
export function projectBucketId(project: Project): string {
  return `flow:${project.id}`;
}

// Validate the shipped definition at load: schema first, then referential
// integrity — every agent must exist, every flow endpoint must be a declared
// agent, every install id must resolve (bundle-aware; throws on unknown ids
// or bundle cycles via resolveModules).
function loadProject(raw: unknown): Project {
  const project = ProjectSchema.parse(raw);
  for (const id of project.agents) {
    if (!COMPOSED_AGENTS[id]) {
      throw new Error(`Project '${project.id}' references unknown agent '${id}'`);
    }
  }
  // N166 — an edge's source is always an agent; its target may be an agent OR a
  // declared terminal status (a "done" node, a status flagged `terminal`).
  const terminalIds = new Set((project.statuses ?? []).filter((s) => s.terminal).map((s) => s.id));
  for (const edge of project.flow) {
    if (!project.agents.includes(edge.from)) {
      throw new Error(
        `Project '${project.id}' flow edge ${edge.from} → ${edge.to} references undeclared agent '${edge.from}'`,
      );
    }
    if (!project.agents.includes(edge.to) && !terminalIds.has(edge.to)) {
      throw new Error(
        `Project '${project.id}' flow edge ${edge.from} → ${edge.to} references undeclared agent or terminal '${edge.to}'`,
      );
    }
  }
  collectProjectInstall(project); // resolves install ids; throws on unknown/cycle
  return project;
}

/** The project's global install, resolved bundle-aware into artifacts. */
export function collectProjectInstall(project: Project): AgentArtifacts {
  return collectArtifacts(
    { id: projectBucketId(project), title: project.title, modules: project.install },
    MODULE_REGISTRY,
  );
}

export const DEFAULT_PROJECT: Project = loadProject(defaultProject);

// N194 — the second built-in flow: a guided lifecycle for authoring custom
// modules/agents/flows. Shipped alongside the default flow.
export const AUTHORING_PROJECT: Project = loadProject(authoringProject);

/**
 * N194 — all shipped (built-in) flows, keyed by id. Generalizes the former
 * "the one built-in project is `default`" assumption so a second built-in flow
 * (authoring) is treated as built-in everywhere: immutable/ejectable like the
 * default, `source: "builtin"`, refused for autonomous MCP edit, etc.
 */
export const BUILTIN_PROJECTS: Record<string, Project> = {
  [DEFAULT_PROJECT.id]: DEFAULT_PROJECT,
  [AUTHORING_PROJECT.id]: AUTHORING_PROJECT,
};

/** Whether `id` is a shipped built-in flow. */
export function isBuiltinProjectId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILTIN_PROJECTS, id);
}
