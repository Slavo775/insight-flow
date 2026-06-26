// N102 — user-space definition registries. Projects author their own modules,
// composed agents, and project flows as JSON files under the consolidated
// root — `insightFlow/modules/`, `insightFlow/agents/`, `insightFlow/projects/`
// — validated with the exact same Zod schemas as the built-ins. Custom ids are
// namespaced (`custom:` prefix, enforced on load); built-ins are immutable —
// user space can add, never shadow.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError, type z } from "zod";
import { AgentModuleSchema, ComposedAgentSchema, ProjectSchema } from "../core/schema/index.js";
import { resolveProjectRoot } from "../core/paths.js";
import {
  COMPOSED_AGENTS,
  MODULE_REGISTRY,
  resolveModules,
  type AgentModule,
  type ComposedAgent,
} from "./compose.js";
import { DEFAULT_PROJECT, type Project } from "./project.js";

export const CUSTOM_ID_PREFIX = "custom:";
export const USER_SPACE_DIRS = ["modules", "agents", "projects"] as const;

/**
 * N119 — the LOCKED tier: shipped definitions that may NOT be ejected/overridden
 * (read-only even in user space). The cross-cutting baseline (N98) plus, later,
 * status-transition modules (N128). Everything else built-in is ejectable.
 * N156 — the id set is shared with the client via `core/locked.ts` (re-exported
 * here so existing importers are unaffected).
 */
export { LOCKED_MODULE_IDS } from "../core/locked.js";
import { LOCKED_MODULE_IDS } from "../core/locked.js";

export function isLockedModuleId(id: string): boolean {
  return LOCKED_MODULE_IDS.has(id);
}

/**
 * N128/N142 — locked-by-kind as well as by id: every `status-transition` and
 * `handover` module is LOCKED (the canonical lifecycle's transitions/handovers
 * are not user-overridable). Custom (`custom:`) modules of these kinds are still
 * allowed — the lock only bars overriding a shipped/built-in definition (see
 * `readKind`).
 */
export function isLockedModule(def: { id: string; kind?: string }): boolean {
  return (
    LOCKED_MODULE_IDS.has(def.id) || def.kind === "status-transition" || def.kind === "handover"
  );
}

/**
 * N188 — whether a module create/edit/override is LOCKED (read-only), matching
 * exactly what the loader (`readKind` → `isLockedModule`) will accept:
 *   - a locked id (security/enforcement/protocol) is always read-only;
 *   - a CUSTOM (`custom:`) module of any kind is editable — including
 *     `status-transition` / `handover` (the loader permits custom ones);
 *   - overriding a BUILT-IN `status-transition` / `handover` is refused
 *     (locked by KIND, not just by id — the loader would reject the override).
 * Single source of truth for the write-path guard (custom-defs `writeDefinition`)
 * and the composer `locked` display flag, so they can never drift.
 */
export function isModuleEditLocked(
  def: { id: string; kind?: string },
  isCustom: boolean = def.id.startsWith(CUSTOM_ID_PREFIX),
): boolean {
  if (LOCKED_MODULE_IDS.has(def.id)) return true;
  if (isCustom) return false;
  return def.kind === "status-transition" || def.kind === "handover";
}

export interface UserRegistries {
  modules: Record<string, AgentModule>;
  agents: Record<string, ComposedAgent>;
  projects: Record<string, Project>;
}

export class UserRegistryError extends Error {
  constructor(file: string, detail: string) {
    super(`Invalid user-space definition ${file}: ${detail}`);
    this.name = "UserRegistryError";
  }
}

function readKind<T extends { id: string }>(
  dir: string,
  schema: z.ZodType<T>,
  builtinIds: Set<string>,
  isLocked: (item: T) => boolean = () => false,
): { items: Record<string, T>; files: Record<string, string>; overrides: Set<string> } {
  const out: Record<string, T> = {};
  const files: Record<string, string> = {};
  const overrides = new Set<string>();
  if (!existsSync(dir)) return { items: out, files, overrides };
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const path = resolve(dir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf-8"));
    } catch (err) {
      throw new UserRegistryError(path, `malformed JSON (${(err as Error).message})`);
    }
    let parsed: T;
    try {
      parsed = schema.parse(raw);
    } catch (err) {
      const detail =
        err instanceof ZodError
          ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          : (err as Error).message;
      throw new UserRegistryError(path, detail);
    }
    // N119 — three id shapes:
    //   custom:*  → additive custom definition (as before)
    //   built-in id (not custom:, not locked) → EJECT/OVERRIDE: shadows the
    //     shipped definition via the merge order below
    //   locked id, or an unknown non-custom id → rejected
    if (!parsed.id.startsWith(CUSTOM_ID_PREFIX)) {
      if (isLocked(parsed)) {
        throw new UserRegistryError(path, `id '${parsed.id}' is locked and cannot be overridden`);
      }
      if (!builtinIds.has(parsed.id)) {
        throw new UserRegistryError(
          path,
          `id '${parsed.id}' must start with '${CUSTOM_ID_PREFIX}' or match a shipped built-in to override`,
        );
      }
      overrides.add(parsed.id);
    }
    if (out[parsed.id]) {
      throw new UserRegistryError(path, `duplicate id '${parsed.id}'`);
    }
    out[parsed.id] = parsed;
    files[parsed.id] = path;
  }
  return { items: out, files, overrides };
}

/** User-space root: always `<projectRoot>/insightFlow`, on either layout. */
export function userSpaceRoot(projectDir: string = resolveProjectRoot()): string {
  return resolve(projectDir, "insightFlow");
}

export function loadUserRegistries(projectDir: string = resolveProjectRoot()): UserRegistries {
  const root = userSpaceRoot(projectDir);

  const { items: modules, overrides: moduleOverrides } = readKind(
    resolve(root, "modules"),
    AgentModuleSchema,
    new Set(Object.keys(MODULE_REGISTRY)),
    isLockedModule,
  );
  for (const mod of Object.values(modules)) {
    // Custom (custom:*) definitions are "custom"; an eject/override (N119) of a
    // built-in id keeps "builtin" — it IS the (edited) shipped definition.
    (mod as { source: string }).source = moduleOverrides.has(mod.id) ? "builtin" : "custom";
  }
  const mergedModules = { ...MODULE_REGISTRY, ...modules };

  const { items: agents, files: agentFiles } = readKind(
    resolve(root, "agents"),
    ComposedAgentSchema,
    new Set(Object.keys(COMPOSED_AGENTS)),
  );
  for (const def of Object.values(agents)) {
    try {
      resolveModules(def, mergedModules); // dangling refs + bundle cycles throw
    } catch (err) {
      throw new UserRegistryError(agentFiles[def.id], (err as Error).message);
    }
    // N191 — declared subagents must resolve to `subagent`-kind modules.
    for (const id of def.subagents ?? []) {
      const m = mergedModules[id];
      if (!m || m.kind !== "subagent") {
        throw new UserRegistryError(
          agentFiles[def.id],
          `subagents references '${id}' which is not a subagent module`,
        );
      }
    }
  }
  const mergedAgents = { ...COMPOSED_AGENTS, ...agents };

  const { items: projects, files: projectFiles } = readKind(
    resolve(root, "projects"),
    ProjectSchema,
    new Set([DEFAULT_PROJECT.id]),
  );
  for (const project of Object.values(projects)) {
    const file = projectFiles[project.id];
    for (const id of project.agents) {
      if (!mergedAgents[id]) {
        throw new UserRegistryError(file, `references unknown agent '${id}'`);
      }
    }
    // N166 — an edge's source is always an agent; its target may be an agent OR a
    // declared terminal status (a "done" node, a status flagged `terminal`).
    const terminalIds = new Set(
      (project.statuses ?? []).filter((s) => s.terminal).map((s) => s.id),
    );
    for (const edge of project.flow) {
      if (!project.agents.includes(edge.from)) {
        throw new UserRegistryError(
          file,
          `flow edge ${edge.from} → ${edge.to} references undeclared agent '${edge.from}'`,
        );
      }
      if (!project.agents.includes(edge.to) && !terminalIds.has(edge.to)) {
        throw new UserRegistryError(
          file,
          `flow edge ${edge.from} → ${edge.to} references undeclared agent or terminal '${edge.to}'`,
        );
      }
    }
    for (const id of project.install) {
      if (!mergedModules[id]) {
        throw new UserRegistryError(file, `install references unknown module '${id}'`);
      }
    }
  }

  return { modules, agents, projects };
}

/** Built-ins + user space, user entries never shadowing (collisions throw at load). */
export function mergedModuleRegistry(projectDir?: string): Record<string, AgentModule> {
  return { ...MODULE_REGISTRY, ...loadUserRegistries(projectDir).modules };
}

export function mergedComposedAgents(projectDir?: string): Record<string, ComposedAgent> {
  return { ...COMPOSED_AGENTS, ...loadUserRegistries(projectDir).agents };
}

export function mergedProjects(projectDir?: string): Record<string, Project> {
  return { [DEFAULT_PROJECT.id]: DEFAULT_PROJECT, ...loadUserRegistries(projectDir).projects };
}
