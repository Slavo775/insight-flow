// N92 — artifact emitter for heterogeneous modules.
//
// Applies a composed agent's non-text contributions to a project directory
// with per-kind merge rules, idempotently:
//   - mcp-server → `.mcp.json` `mcpServers[name]`, deduped by name; a
//     same-name contribution with a different config throws (never silently
//     overwrite someone's server definition). Configs are compared with
//     sorted-key stringification, so key order never causes a false conflict.
//   - hook → `.claude/settings.json` `hooks[event]` matcher groups. JSON has
//     no comment markers, so managed entries are tracked in a sidecar
//     manifest (`.claude/taskflow-managed.json`), **bucketed per agent id**:
//     applying agent A only reconciles A's own entries — installing,
//     re-applying, or regenerating other agents never touches them. Removing
//     a module from an agent removes its hook on the next apply.
//   - skill → `.claude/skills/<name>/SKILL.md` (name is schema-restricted to
//     a safe path segment). Skill names are claimed per agent in the same
//     manifest; a second agent contributing an already-claimed name throws.
//     Skills an agent no longer contributes are deleted.
// Every write is change-detected; `applyArtifacts` reports created/updated/
// unchanged/removed per target so a second identical run prints `unchanged`.
//
// Note: the parse → stringify round-trip normalizes the touched JSON files to
// 2-space formatting; content and key order are preserved.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentArtifacts } from "./compose.js";

export type EmitAction = "created" | "updated" | "unchanged" | "removed";
export interface EmitReport {
  target: string;
  action: EmitAction;
}

interface ManagedEntry {
  hooks: { event: string; matcher?: string; command: string }[];
  /** Hook script files owned by this agent (under .claude/hooks/). */
  scripts?: string[];
  skills: string[];
}

interface ManagedManifest {
  agents: Record<string, ManagedEntry>;
}

const MANIFEST_PATH = ".claude/taskflow-managed.json";

interface HookGroup {
  matcher?: string;
  hooks: { type: "command"; command: string; timeout?: number }[];
  [key: string]: unknown;
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// Deterministic deep-stringify (sorted object keys) for config equality.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function writeJsonIfChanged(path: string, value: unknown): EmitAction {
  const next = JSON.stringify(value, null, 2) + "\n";
  const prev = existsSync(path) ? readFileSync(path, "utf-8") : null;
  if (prev === next) return "unchanged";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  return prev === null ? "created" : "updated";
}

function applyMcpServers(
  projectRoot: string,
  servers: AgentArtifacts["mcpServers"],
  reports: EmitReport[],
): void {
  if (!servers.length) return;
  const path = join(projectRoot, ".mcp.json");
  const doc = readJson<{ mcpServers?: Record<string, unknown> }>(path, {});
  doc.mcpServers ??= {};
  for (const { name, config } of servers) {
    const existing = doc.mcpServers[name];
    if (existing !== undefined && stableStringify(existing) !== stableStringify(config)) {
      throw new Error(
        `.mcp.json already defines server '${name}' with a different config — refusing to overwrite`,
      );
    }
    doc.mcpServers[name] = config;
  }
  reports.push({ target: ".mcp.json", action: writeJsonIfChanged(path, doc) });
}

function applyHooks(
  projectRoot: string,
  hooks: AgentArtifacts["hooks"],
  owned: ManagedEntry,
  reports: EmitReport[],
): void {
  const ownedScripts = owned.scripts ?? [];
  if (!hooks.length && !owned.hooks.length && !ownedScripts.length) return;

  // Hook script files (N94): remove scripts this agent no longer contributes,
  // then write the current set (0755).
  const currentScripts = hooks.flatMap((h) => (h.script ? [h.script.name] : []));
  for (const name of ownedScripts) {
    if (currentScripts.includes(name)) continue;
    const scriptPath = join(projectRoot, ".claude/hooks", name);
    if (existsSync(scriptPath)) {
      rmSync(scriptPath);
      reports.push({ target: `.claude/hooks/${name}`, action: "removed" });
    }
  }
  for (const hook of hooks) {
    if (!hook.script) continue;
    const scriptPath = join(projectRoot, ".claude/hooks", hook.script.name);
    const body = hook.script.content.endsWith("\n")
      ? hook.script.content
      : hook.script.content + "\n";
    const prev = existsSync(scriptPath) ? readFileSync(scriptPath, "utf-8") : null;
    if (prev === body) {
      reports.push({ target: `.claude/hooks/${hook.script.name}`, action: "unchanged" });
    } else {
      mkdirSync(dirname(scriptPath), { recursive: true });
      writeFileSync(scriptPath, body, { mode: 0o755 });
      reports.push({
        target: `.claude/hooks/${hook.script.name}`,
        action: prev === null ? "created" : "updated",
      });
    }
  }

  const path = join(projectRoot, ".claude/settings.json");
  const settings = readJson<{ hooks?: Record<string, HookGroup[]>; [k: string]: unknown }>(
    path,
    {},
  );
  settings.hooks ??= {};

  // Remove this agent's previously-managed entries, then insert the current
  // set. Incoming hooks also "adopt" exact-matching unmanaged entries (event +
  // matcher + command) so pre-manifest installs (the bespoke pre-N94 lifecycle
  // installer) migrate without duplicating.
  const toClear = [
    ...owned.hooks,
    ...hooks.map((h) => ({ event: h.event, matcher: h.matcher, command: h.command })),
  ];
  for (const old of toClear) {
    const groups = settings.hooks[old.event];
    if (!groups) continue;
    settings.hooks[old.event] = groups.filter(
      (g) =>
        !(
          (g.matcher ?? "") === (old.matcher ?? "") &&
          g.hooks?.some((h) => h.type === "command" && h.command === old.command)
        ),
    );
    if (!settings.hooks[old.event].length) delete settings.hooks[old.event];
  }
  for (const hook of hooks) {
    const group: HookGroup = {
      ...(hook.matcher !== undefined ? { matcher: hook.matcher } : {}),
      hooks: [
        {
          type: "command",
          command: hook.command,
          ...(hook.timeout !== undefined ? { timeout: hook.timeout } : {}),
        },
      ],
    };
    (settings.hooks[hook.event] ??= []).push(group);
  }
  if (!Object.keys(settings.hooks).length) delete settings.hooks;

  const action = writeJsonIfChanged(path, settings);
  reports.push({
    target: ".claude/settings.json",
    action: action === "unchanged" ? "unchanged" : hooks.length ? action : "removed",
  });
  owned.hooks = hooks.map((h) => ({ event: h.event, matcher: h.matcher, command: h.command }));
  owned.scripts = currentScripts;
}

function applySkills(
  projectRoot: string,
  agentId: string,
  skills: AgentArtifacts["skills"],
  manifest: ManagedManifest,
  owned: ManagedEntry,
  reports: EmitReport[],
): void {
  // A skill name is claimed by exactly one agent.
  for (const { name } of skills) {
    for (const [otherId, entry] of Object.entries(manifest.agents)) {
      if (otherId !== agentId && entry.skills.includes(name)) {
        throw new Error(
          `skill '${name}' is already managed by agent '${otherId}' — refusing to overwrite`,
        );
      }
    }
  }

  const current = new Set(skills.map((s) => s.name));
  for (const name of owned.skills) {
    if (current.has(name)) continue;
    const dir = join(projectRoot, ".claude/skills", name);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
      reports.push({ target: `.claude/skills/${name}/SKILL.md`, action: "removed" });
    }
  }
  for (const { name, content } of skills) {
    const path = join(projectRoot, ".claude/skills", name, "SKILL.md");
    const body = content.endsWith("\n") ? content : content + "\n";
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : null;
    if (prev === body) {
      reports.push({ target: `.claude/skills/${name}/SKILL.md`, action: "unchanged" });
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
    reports.push({
      target: `.claude/skills/${name}/SKILL.md`,
      action: prev === null ? "created" : "updated",
    });
  }
  owned.skills = [...current];
}

/**
 * Apply `agentId`'s artifacts to `projectRoot`. Idempotent per agent: a
 * second apply with the same artifacts reports every target as `unchanged`;
 * artifacts the agent no longer contributes are removed. Other agents'
 * managed artifacts are never touched. `vars` substitutes `__KEY__` tokens in
 * hook commands and script contents (e.g. INSIGHT_FLOW_BIN — N94).
 */
export function applyArtifacts(
  artifacts: AgentArtifacts,
  projectRoot: string,
  agentId: string,
  vars?: Record<string, string>,
): EmitReport[] {
  const sub = (text: string): string =>
    vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.split(`__${k}__`).join(v), text) : text;
  const hooks = artifacts.hooks.map((h) => ({
    ...h,
    command: sub(h.command),
    script: h.script ? { name: h.script.name, content: sub(h.script.content) } : undefined,
  }));

  const reports: EmitReport[] = [];
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  // Rebuild the manifest from the parsed file so unknown/legacy keys
  // (e.g. the pre-release agent-agnostic shape) are dropped on next write.
  const parsed = readJson<Partial<ManagedManifest>>(manifestPath, {});
  const manifest: ManagedManifest = { agents: parsed.agents ?? {} };
  const owned = manifest.agents[agentId] ?? { hooks: [], skills: [] };
  owned.hooks ??= [];
  owned.skills ??= [];

  applyMcpServers(projectRoot, artifacts.mcpServers, reports);
  applyHooks(projectRoot, hooks, owned, reports);
  applySkills(projectRoot, agentId, artifacts.skills, manifest, owned, reports);

  if (owned.hooks.length || owned.skills.length || owned.scripts?.length)
    manifest.agents[agentId] = owned;
  else delete manifest.agents[agentId];

  if (Object.keys(manifest.agents).length) {
    writeJsonIfChanged(manifestPath, manifest);
  } else if (existsSync(manifestPath)) {
    rmSync(manifestPath);
  }
  return reports;
}
