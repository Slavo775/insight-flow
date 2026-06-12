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

export type Project = z.infer<typeof ProjectSchema>;

/** Manifest bucket id for a project's global installs. */
export function projectBucketId(project: Project): string {
  return `project:${project.id}`;
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
  for (const edge of project.flow) {
    for (const end of [edge.from, edge.to]) {
      if (!project.agents.includes(end)) {
        throw new Error(
          `Project '${project.id}' flow edge ${edge.from} → ${edge.to} references undeclared agent '${end}'`,
        );
      }
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
