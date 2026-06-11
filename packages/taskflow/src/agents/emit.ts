// N92 — artifact emitter for heterogeneous modules.
//
// Applies a composed agent's non-text contributions to a project directory
// with per-kind merge rules, idempotently:
//   - mcp-server → `.mcp.json` `mcpServers[name]`, deduped by name; a
//     same-name contribution with a different config throws (never silently
//     overwrite someone's server definition).
//   - hook → `.claude/settings.json` `hooks[event]` matcher groups. JSON has
//     no comment markers, so managed entries are tracked in a sidecar
//     manifest (`.claude/taskflow-managed.json`): every apply removes the
//     previously-managed entries and inserts the current set, so re-applies
//     replace cleanly and removing a module from the agent removes its hook.
//   - skill → `.claude/skills/<name>/SKILL.md` (name is schema-restricted to
//     a safe path segment). Managed names are tracked in the same manifest;
//     skills no longer contributed are deleted.
// Every write is change-detected; `apply` reports created/updated/unchanged/
// removed per target so a second run prints only `unchanged`.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentArtifacts } from "./compose.js";

export type EmitAction = "created" | "updated" | "unchanged" | "removed";
export interface EmitReport {
  target: string;
  action: EmitAction;
}

interface ManagedManifest {
  hooks: { event: string; matcher?: string; command: string }[];
  skills: string[];
}

const MANIFEST_PATH = ".claude/taskflow-managed.json";

interface HookGroup {
  matcher?: string;
  hooks: { type: "command"; command: string }[];
  [key: string]: unknown;
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
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
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(config)) {
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
  managed: ManagedManifest,
  reports: EmitReport[],
): void {
  const path = join(projectRoot, ".claude/settings.json");
  const settings = readJson<{ hooks?: Record<string, HookGroup[]>; [k: string]: unknown }>(
    path,
    {},
  );
  settings.hooks ??= {};

  // Remove every previously-managed entry, then insert the current set.
  for (const old of managed.hooks) {
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
      hooks: [{ type: "command", command: hook.command }],
    };
    (settings.hooks[hook.event] ??= []).push(group);
  }
  if (!Object.keys(settings.hooks).length) delete settings.hooks;

  const hadWork = hooks.length > 0 || managed.hooks.length > 0;
  if (!hadWork) return;
  const action = writeJsonIfChanged(path, settings);
  reports.push({
    target: ".claude/settings.json",
    action: action === "unchanged" ? "unchanged" : hooks.length ? action : "removed",
  });
  managed.hooks = hooks.map((h) => ({ event: h.event, matcher: h.matcher, command: h.command }));
}

function applySkills(
  projectRoot: string,
  skills: AgentArtifacts["skills"],
  managed: ManagedManifest,
  reports: EmitReport[],
): void {
  const current = new Set(skills.map((s) => s.name));
  for (const name of managed.skills) {
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
  managed.skills = [...current];
}

/**
 * Apply an agent's artifacts to `projectRoot`. Idempotent: a second apply
 * with the same artifacts reports every target as `unchanged`; artifacts no
 * longer contributed (per the managed manifest) are removed.
 */
export function applyArtifacts(artifacts: AgentArtifacts, projectRoot: string): EmitReport[] {
  const reports: EmitReport[] = [];
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  const managed = readJson<ManagedManifest>(manifestPath, { hooks: [], skills: [] });
  managed.hooks ??= [];
  managed.skills ??= [];
  const before = JSON.stringify(managed);

  applyMcpServers(projectRoot, artifacts.mcpServers, reports);
  applyHooks(projectRoot, artifacts.hooks, managed, reports);
  applySkills(projectRoot, artifacts.skills, managed, reports);

  const hasManaged = managed.hooks.length > 0 || managed.skills.length > 0;
  if (hasManaged || existsSync(manifestPath)) {
    if (hasManaged) {
      if (JSON.stringify(managed) !== before || !existsSync(manifestPath)) {
        writeJsonIfChanged(manifestPath, managed);
      }
    } else {
      rmSync(manifestPath);
    }
  }
  return reports;
}
