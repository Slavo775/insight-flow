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
//     manifest (`.claude/taskflow-managed.json`), **bucketed per install target**
//     (N174: `flow:<id>` / `agent:<id>` / `module:<id>`): applying target A only
//     reconciles A's own entries — installing, re-applying, or regenerating other
//     targets never touches them. Removing a module from A removes its hook on the
//     next apply, and uninstalling A removes only what no other target still owns.
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
import { substituteVars } from "../core/inputs.js";

export type EmitAction = "created" | "updated" | "unchanged" | "removed";
export interface EmitReport {
  target: string;
  action: EmitAction;
}

// N165 — a same-name conflict whose definition genuinely differs. Carries the
// installed vs incoming sides so the install UI can render a before/after diff
// and offer an explicit overwrite (force). `applyArtifacts` throws this for an
// mcp-server config that differs from what's already in `.mcp.json`.
export interface InstallConflict {
  kind: "mcp" | "skill" | "command";
  name: string;
  installed: unknown;
  incoming: unknown;
}

export class InstallConflictError extends Error {
  readonly conflict: InstallConflict;
  constructor(conflict: InstallConflict) {
    super(
      conflict.kind === "mcp"
        ? `.mcp.json already defines server '${conflict.name}' with a different config — refusing to overwrite`
        : `${conflict.kind} '${conflict.name}' already exists with a different definition — refusing to overwrite`,
    );
    this.name = "InstallConflictError";
    this.conflict = conflict;
  }
}

interface ManagedEntry {
  hooks: { event: string; matcher?: string; command: string }[];
  /** Hook script files owned by this agent (under .claude/hooks/). */
  scripts?: string[];
  skills: string[];
  /** N138 — installable commands/skills (the agent's composed prompt) owned by this agent. */
  commands?: { name: string; as: "command" | "skill" }[];
  /** N174 — mcp-server names this target owns in `.mcp.json` (for reference-safe uninstall). */
  mcpServers?: string[];
  /**
   * N174 — prior `.mcp.json` values this target overwrote on a force-install,
   * keyed by server name. On uninstall, an owned mcp entry that no longer has
   * any other owner is restored to its snapshot (the N172 undo) instead of
   * deleted, so removing a target rewinds the config it clobbered.
   */
  mcpSnapshots?: Record<string, unknown>;
}

interface ManagedManifest {
  agents: Record<string, ManagedEntry>;
}

const MANIFEST_PATH = ".claude/taskflow-managed.json";

/**
 * N174 — migrate pre-N174 flow buckets (`project:<id>`) to the target-based
 * scheme (`flow:<id>`). In-place on the parsed manifest; skips a rename whose
 * destination already exists (no clobber). Runs before every apply/uninstall so
 * existing on-disk manifests adopt the new keys transparently.
 */
function migrateBuckets(manifest: ManagedManifest): void {
  for (const key of Object.keys(manifest.agents)) {
    if (!key.startsWith("project:")) continue;
    const to = `flow:${key.slice("project:".length)}`;
    if (manifest.agents[to]) continue;
    manifest.agents[to] = manifest.agents[key];
    delete manifest.agents[key];
  }
}

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

/**
 * N172 — restore a single `.mcp.json` server entry to a prior config (the undo of
 * an N165 overwrite). Writes the entry directly (force); no conflict check, since
 * the caller is intentionally rolling back to a captured prior value.
 */
export function restoreMcpServer(projectRoot: string, name: string, config: unknown): EmitAction {
  const path = join(projectRoot, ".mcp.json");
  const doc = readJson<{ mcpServers?: Record<string, unknown> }>(path, {});
  doc.mcpServers ??= {};
  doc.mcpServers[name] = config;
  return writeJsonIfChanged(path, doc);
}

function applyMcpServers(
  projectRoot: string,
  servers: AgentArtifacts["mcpServers"],
  owned: ManagedEntry,
  reports: EmitReport[],
  force = false,
): void {
  // N174 — claim ownership of exactly the servers this target contributes now,
  // so an uninstall knows which `.mcp.json` entries are ours (reference-safe).
  owned.mcpServers = servers.map((s) => s.name);
  if (!servers.length) return;
  const path = join(projectRoot, ".mcp.json");
  const doc = readJson<{ mcpServers?: Record<string, unknown> }>(path, {});
  doc.mcpServers ??= {};
  for (const { name, config } of servers) {
    const existing = doc.mcpServers[name];
    // N165 — configs are already `${VAR}`-resolved by the caller, so this
    // compares resolved-incoming vs installed: an identical value is idempotent;
    // a genuine difference is a structured conflict unless `force` overwrites it.
    if (existing !== undefined && stableStringify(existing) !== stableStringify(config)) {
      if (!force) {
        throw new InstallConflictError({
          kind: "mcp",
          name,
          installed: existing,
          incoming: config,
        });
      }
      // N174 — record the clobbered value so uninstall can restore it (N172 undo).
      (owned.mcpSnapshots ??= {})[name] = existing;
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

// N153 — the on-disk namespace an artifact occupies: a `skill` module and a
// `command` installed `as:"skill"` BOTH write `.claude/skills/<name>/SKILL.md`,
// so they share one namespace; `as:"command"` lives under `.claude/commands/`.
function claimKey(name: string, as: "command" | "skill"): string {
  return as === "skill" ? `skills/${name}` : `commands/${name}`;
}

// N153 — every (namespace, name) claimed by OTHER agents, with the owner id.
// Cross-checks commands AND skills so a command-as-skill vs skill-module
// collision in `.claude/skills/<name>` is caught (was previously missed: the
// command guard only scanned `commands`, the skill guard only `skills`).
function collectOtherClaims(manifest: ManagedManifest, agentId: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [otherId, entry] of Object.entries(manifest.agents)) {
    if (otherId === agentId) continue;
    for (const c of entry.commands ?? []) out.set(claimKey(c.name, c.as), otherId);
    for (const s of entry.skills ?? []) out.set(claimKey(s, "skill"), otherId);
  }
  return out;
}

function applySkills(
  projectRoot: string,
  agentId: string,
  skills: AgentArtifacts["skills"],
  manifest: ManagedManifest,
  owned: ManagedEntry,
  reports: EmitReport[],
): void {
  // A skill name is claimed by exactly one agent — across the shared
  // `.claude/skills` namespace (skill modules + commands installed as skills).
  const others = collectOtherClaims(manifest, agentId);
  for (const { name, content } of skills) {
    const owner = others.get(claimKey(name, "skill"));
    if (!owner) continue;
    // N164 — a second flow re-claiming an *identical* skill is idempotent;
    // only a genuinely different definition is a conflict (N165 overwrite path).
    const path = join(projectRoot, ".claude/skills", name, "SKILL.md");
    const body = content.endsWith("\n") ? content : content + "\n";
    const onDisk = existsSync(path) ? readFileSync(path, "utf-8") : null;
    if (onDisk !== body) {
      throw new Error(
        `skill '${name}' is already managed by agent '${owner}' with a different definition — refusing to overwrite`,
      );
    }
  }

  const current = new Set(skills.map((s) => s.name));
  for (const name of owned.skills) {
    if (current.has(name)) continue;
    // N164 review-fix — don't delete a skill another agent/flow still claims
    // (shared-ownership: the same identical skill installed by multiple flows).
    if (others.has(claimKey(name, "skill"))) continue;
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

// N138 — install the agent's composed prompt as a runnable slash command
// (`.claude/commands/<name>.md`) or skill (`.claude/skills/<name>/SKILL.md`).
// Names are claimed per agent in the manifest (a second agent claiming the same
// name throws); a command this agent no longer contributes — or whose target
// kind changed — is removed on the next apply.
function applyCommands(
  projectRoot: string,
  agentId: string,
  commands: AgentArtifacts["commands"],
  manifest: ManagedManifest,
  owned: ManagedEntry,
  reports: EmitReport[],
): void {
  const label = (name: string, as: "command" | "skill"): string =>
    as === "skill" ? `.claude/skills/${name}/SKILL.md` : `.claude/commands/${name}.md`;
  const writePath = (name: string, as: "command" | "skill"): string =>
    as === "skill"
      ? join(projectRoot, ".claude/skills", name, "SKILL.md")
      : join(projectRoot, ".claude/commands", `${name}.md`);
  const removePath = (name: string, as: "command" | "skill"): string =>
    as === "skill"
      ? join(projectRoot, ".claude/skills", name)
      : join(projectRoot, ".claude/commands", `${name}.md`);

  // A command/skill name is claimed by exactly one agent, checked in the
  // namespace it actually writes to (N153: as:"skill" shares `.claude/skills`).
  const others = collectOtherClaims(manifest, agentId);
  for (const { name, as, body } of commands) {
    const owner = others.get(claimKey(name, as));
    if (!owner) continue;
    // N164 — a second flow re-claiming an *identical* command/skill is
    // idempotent; only a genuinely different definition conflicts (N165).
    const path = writePath(name, as);
    const text = body.endsWith("\n") ? body : body + "\n";
    const onDisk = existsSync(path) ? readFileSync(path, "utf-8") : null;
    if (onDisk !== text) {
      throw new Error(
        `${as} '${name}' is already managed by agent '${owner}' with a different definition — refusing to overwrite`,
      );
    }
  }

  const current = new Map(commands.map((c) => [c.name, c]));
  for (const old of owned.commands ?? []) {
    const still = current.get(old.name);
    if (still && still.as === old.as) continue; // kept (target kind unchanged)
    // N164 review-fix — don't delete a command/skill another agent/flow still
    // claims (shared-ownership across flows that install the same agent).
    if (others.has(claimKey(old.name, old.as))) continue;
    const path = removePath(old.name, old.as);
    if (existsSync(path)) {
      rmSync(path, old.as === "skill" ? { recursive: true } : {});
      reports.push({ target: label(old.name, old.as), action: "removed" });
    }
  }
  for (const { name, body, as } of commands) {
    const path = writePath(name, as);
    const text = body.endsWith("\n") ? body : body + "\n";
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : null;
    if (prev === text) {
      reports.push({ target: label(name, as), action: "unchanged" });
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    reports.push({ target: label(name, as), action: prev === null ? "created" : "updated" });
  }
  owned.commands = commands.map((c) => ({ name: c.name, as: c.as }));
}

/**
 * Rename a manifest bucket (N96: the N94-era `activity` bucket becomes the
 * project bucket `project:default`). No-op when `from` is absent or `to`
 * already exists.
 */
export function renameManifestBucket(projectRoot: string, from: string, to: string): void {
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  const parsed = readJson<Partial<ManagedManifest>>(manifestPath, {});
  const agents = parsed.agents ?? {};
  if (!agents[from] || agents[to]) return;
  agents[to] = agents[from];
  delete agents[from];
  writeJsonIfChanged(manifestPath, { agents });
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
  options?: { force?: boolean },
): EmitReport[] {
  const sub = (text: string): string =>
    vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.split(`__${k}__`).join(v), text) : text;
  // N165/N171 (review-fix) — `${VAR}` input substitution is limited to
  // config-like surfaces: the hook COMMAND and the mcp config. Prose (skill
  // content, command/prompt bodies) and hook SCRIPT content (which legitimately
  // contains shell/JS `${...}` — e.g. task-git's PR-prefill examples) are NOT
  // templated, so their placeholders are left exactly as authored. Only provided
  // values are replaced; an unprovided `${VAR}` (e.g. `${CLAUDE_PROJECT_DIR}`)
  // stays literal.
  const subVars = (text: string): string => (vars ? substituteVars(text, vars) : text);
  const hooks = artifacts.hooks.map((h) => ({
    ...h,
    command: subVars(sub(h.command)),
    script: h.script ? { name: h.script.name, content: sub(h.script.content) } : undefined,
  }));
  // N165 — resolve `${VAR}` placeholders in mcp configs from the same vars map
  // (input values flow in here), so applyMcpServers compares resolved configs.
  const mcpServers = vars
    ? artifacts.mcpServers.map((m) => ({ ...m, config: substituteVars(m.config, vars) }))
    : artifacts.mcpServers;

  const reports: EmitReport[] = [];
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  // Rebuild the manifest from the parsed file so unknown/legacy keys
  // (e.g. the pre-release agent-agnostic shape) are dropped on next write.
  const parsed = readJson<Partial<ManagedManifest>>(manifestPath, {});
  const manifest: ManagedManifest = { agents: parsed.agents ?? {} };
  migrateBuckets(manifest); // N174 — project:<id> → flow:<id>
  const owned = manifest.agents[agentId] ?? { hooks: [], skills: [] };
  owned.hooks ??= [];
  owned.skills ??= [];
  owned.commands ??= [];

  applyMcpServers(projectRoot, mcpServers, owned, reports, options?.force ?? false);
  applyHooks(projectRoot, hooks, owned, reports);
  applySkills(projectRoot, agentId, artifacts.skills, manifest, owned, reports);
  applyCommands(projectRoot, agentId, artifacts.commands, manifest, owned, reports);

  if (
    owned.hooks.length ||
    owned.skills.length ||
    owned.scripts?.length ||
    owned.commands?.length ||
    owned.mcpServers?.length
  )
    manifest.agents[agentId] = owned;
  else delete manifest.agents[agentId];

  if (Object.keys(manifest.agents).length) {
    writeJsonIfChanged(manifestPath, manifest);
  } else if (existsSync(manifestPath)) {
    rmSync(manifestPath);
  }
  return reports;
}

// N174 — uninstall: remove a target's artifacts, reference-safe ----------------

function hookKey(h: { event: string; matcher?: string; command: string }): string {
  return `${h.event}|${h.matcher ?? ""}|${h.command}`;
}

/**
 * Everything claimed by buckets OTHER than `exceptBucket`. An artifact present
 * here is still owned by someone, so uninstalling `exceptBucket` must NOT remove
 * it from disk (reference-safe shared ownership across install targets).
 */
function collectClaimsExcept(
  manifest: ManagedManifest,
  exceptBucket: string,
): { mcp: Set<string>; hooks: Set<string>; scripts: Set<string>; namespaced: Set<string> } {
  const mcp = new Set<string>();
  const hooks = new Set<string>();
  const scripts = new Set<string>();
  const namespaced = new Set<string>();
  for (const [id, entry] of Object.entries(manifest.agents)) {
    if (id === exceptBucket) continue;
    for (const name of entry.mcpServers ?? []) mcp.add(name);
    for (const h of entry.hooks ?? []) hooks.add(hookKey(h));
    for (const s of entry.scripts ?? []) scripts.add(s);
    for (const s of entry.skills ?? []) namespaced.add(claimKey(s, "skill"));
    for (const c of entry.commands ?? []) namespaced.add(claimKey(c.name, c.as));
  }
  return { mcp, hooks, scripts, namespaced };
}

/** One artifact in an uninstall plan: removed (no other owner) or retained. */
export interface UninstallStep {
  kind: "mcp" | "hook" | "skill" | "command";
  key: string;
  label: string;
  target: string;
  action: "removed" | "retained";
}

/**
 * What uninstalling `bucketId` would do, without writing. Each owned artifact is
 * `removed` (no other target owns it) or `retained` (still owned elsewhere).
 * Empty when the bucket owns nothing / does not exist.
 */
export function uninstallPlan(projectRoot: string, bucketId: string): UninstallStep[] {
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  const parsed = readJson<Partial<ManagedManifest>>(manifestPath, {});
  const manifest: ManagedManifest = { agents: parsed.agents ?? {} };
  migrateBuckets(manifest);
  const owned = manifest.agents[bucketId];
  if (!owned) return [];
  const others = collectClaimsExcept(manifest, bucketId);
  const steps: UninstallStep[] = [];
  for (const name of owned.mcpServers ?? []) {
    const retained = others.mcp.has(name);
    steps.push({
      kind: "mcp",
      key: name,
      label: `MCP server: ${name}`,
      target: ".mcp.json",
      action: retained ? "retained" : "removed",
    });
  }
  for (const h of owned.hooks ?? []) {
    const retained = others.hooks.has(hookKey(h));
    steps.push({
      kind: "hook",
      key: hookKey(h),
      label: `Hook: ${h.event}${h.matcher ? ` (${h.matcher})` : ""}`,
      target: ".claude/settings.json",
      action: retained ? "retained" : "removed",
    });
  }
  for (const name of owned.skills ?? []) {
    const retained = others.namespaced.has(claimKey(name, "skill"));
    steps.push({
      kind: "skill",
      key: name,
      label: `Skill: ${name}`,
      target: `.claude/skills/${name}/SKILL.md`,
      action: retained ? "retained" : "removed",
    });
  }
  for (const c of owned.commands ?? []) {
    const retained = others.namespaced.has(claimKey(c.name, c.as));
    steps.push({
      kind: "command",
      key: c.name,
      label: `${c.as === "skill" ? "Skill" : "Command"}: /${c.name}`,
      target:
        c.as === "skill" ? `.claude/skills/${c.name}/SKILL.md` : `.claude/commands/${c.name}.md`,
      action: retained ? "retained" : "removed",
    });
  }
  return steps;
}

/**
 * Uninstall `bucketId`: drop its manifest claim and physically remove every
 * artifact no other target still owns. An owned mcp entry that overwrote a prior
 * config is restored to that snapshot (N172 undo) instead of deleted. Idempotent
 * — uninstalling an unknown bucket is a no-op.
 */
export function uninstallTarget(projectRoot: string, bucketId: string): EmitReport[] {
  const reports: EmitReport[] = [];
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  const parsed = readJson<Partial<ManagedManifest>>(manifestPath, {});
  const manifest: ManagedManifest = { agents: parsed.agents ?? {} };
  migrateBuckets(manifest);
  const owned = manifest.agents[bucketId];
  if (!owned) return reports;
  const others = collectClaimsExcept(manifest, bucketId);

  // .mcp.json — delete or restore the snapshot for each unshared owned server.
  const ownedMcp = (owned.mcpServers ?? []).filter((n) => !others.mcp.has(n));
  if (ownedMcp.length) {
    const path = join(projectRoot, ".mcp.json");
    const doc = readJson<{ mcpServers?: Record<string, unknown> }>(path, {});
    if (doc.mcpServers) {
      for (const name of ownedMcp) {
        const snapshot = owned.mcpSnapshots?.[name];
        if (snapshot !== undefined) doc.mcpServers[name] = snapshot;
        else delete doc.mcpServers[name];
      }
      reports.push({ target: ".mcp.json", action: writeJsonIfChanged(path, doc) });
    }
  }

  // .claude/settings.json — drop unshared owned hook groups + their scripts.
  const ownedHooks = (owned.hooks ?? []).filter((h) => !others.hooks.has(hookKey(h)));
  const ownedScripts = (owned.scripts ?? []).filter((s) => !others.scripts.has(s));
  if (ownedHooks.length) {
    const path = join(projectRoot, ".claude/settings.json");
    const settings = readJson<{ hooks?: Record<string, HookGroup[]>; [k: string]: unknown }>(
      path,
      {},
    );
    if (settings.hooks) {
      for (const old of ownedHooks) {
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
      if (!Object.keys(settings.hooks).length) delete settings.hooks;
      reports.push({ target: ".claude/settings.json", action: writeJsonIfChanged(path, settings) });
    }
  }
  for (const name of ownedScripts) {
    const scriptPath = join(projectRoot, ".claude/hooks", name);
    if (existsSync(scriptPath)) {
      rmSync(scriptPath);
      reports.push({ target: `.claude/hooks/${name}`, action: "removed" });
    }
  }

  // Skills + commands — delete unshared owned files/dirs.
  for (const name of owned.skills ?? []) {
    if (others.namespaced.has(claimKey(name, "skill"))) continue;
    const dir = join(projectRoot, ".claude/skills", name);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
      reports.push({ target: `.claude/skills/${name}/SKILL.md`, action: "removed" });
    }
  }
  for (const c of owned.commands ?? []) {
    if (others.namespaced.has(claimKey(c.name, c.as))) continue;
    const path =
      c.as === "skill"
        ? join(projectRoot, ".claude/skills", c.name)
        : join(projectRoot, ".claude/commands", `${c.name}.md`);
    if (existsSync(path)) {
      rmSync(path, c.as === "skill" ? { recursive: true } : {});
      reports.push({
        target:
          c.as === "skill" ? `.claude/skills/${c.name}/SKILL.md` : `.claude/commands/${c.name}.md`,
        action: "removed",
      });
    }
  }

  delete manifest.agents[bucketId];
  if (Object.keys(manifest.agents).length) {
    writeJsonIfChanged(manifestPath, manifest);
  } else if (existsSync(manifestPath)) {
    rmSync(manifestPath);
  }
  return reports;
}
