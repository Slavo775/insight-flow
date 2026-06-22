import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { Task, TaskflowConfig, ActivityEngineConfig, NotificationsConfig } from "./types.js";
import { resolveProjectRoot, resolveFlowRoot, DEFAULT_WORK_DIR } from "./paths.js";

const CONFIG_FILENAME = "taskflow.config.json";

const ACTIVITY_DEFAULTS: ActivityEngineConfig = {
  enabled: true,
  logFile: ".taskflow-activity.jsonl",
  maxEvents: 200,
  phaseMarkers: true,
  hookEnrichment: true,
  verbosity: "both",
};

const NOTIFICATION_DEFAULTS: NotificationsConfig = {
  browser: true,
  cli: true,
};

const DEFAULTS: TaskflowConfig = {
  workDir: DEFAULT_WORK_DIR,
  shardSize: 10,
  projectName: "",
  rolesDir: ".claude/roles",
  server: {
    port: 6006,
  },
  activityEngine: ACTIVITY_DEFAULTS,
  notifications: NOTIFICATION_DEFAULTS,
  // N116 — flow binding. Empty byType ships safe (every task → "default");
  // projects opt in by mapping types to their custom flows, e.g.
  // `"flows": { "defaultFlow": "default", "byType": { "fix": "custom:hotfix" } }`.
  flows: { defaultFlow: "default", byType: {} },
  agents: {
    git: {
      permissions: {
        createBranch: true,
        checkout: true,
        commit: true,
        push: true,
        forcePush: false,
        merge: true,
        deleteBranchLocal: true,
        deleteBranchRemote: true,
        createPR: true,
      },
    },
  },
};

export function resolveConfig(cwd: string = process.cwd()): TaskflowConfig {
  const projectRoot = safeResolveProjectRoot(cwd);
  const anchor = projectRoot ?? cwd;
  const configPath = resolve(anchor, CONFIG_FILENAME);
  let userConfig: Partial<TaskflowConfig> = {};

  if (existsSync(configPath)) {
    userConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  const projectName = userConfig.projectName || inferProjectName(anchor) || "project";

  const userGitPerms = userConfig.agents?.git?.permissions ?? {};
  const mergedAgentsGitPerms = {
    ...DEFAULTS.agents!.git!.permissions,
    ...userGitPerms,
  };

  // remoteOps: "deny" sets all origin-touching flags to false unless individually overridden
  if (mergedAgentsGitPerms.remoteOps === "deny") {
    const remoteFlags = ["push", "forcePush", "deleteBranchRemote", "createPR"] as const;
    for (const flag of remoteFlags) {
      if (!(flag in userGitPerms)) {
        mergedAgentsGitPerms[flag] = false;
      }
    }
  }

  return {
    ...DEFAULTS,
    ...userConfig,
    projectName,
    server: {
      ...DEFAULTS.server,
      ...(userConfig.server ?? {}),
    },
    activityEngine: {
      ...ACTIVITY_DEFAULTS,
      ...(userConfig.activityEngine ?? {}),
    },
    notifications: {
      ...NOTIFICATION_DEFAULTS,
      ...(userConfig.notifications ?? {}),
    },
    flows: {
      defaultFlow: userConfig.flows?.defaultFlow ?? DEFAULTS.flows!.defaultFlow,
      byType: { ...DEFAULTS.flows!.byType, ...(userConfig.flows?.byType ?? {}) },
    },
    agents: {
      ...(DEFAULTS.agents ?? {}),
      ...(userConfig.agents ?? {}),
      git: {
        ...(userConfig.agents?.git ?? {}),
        permissions: mergedAgentsGitPerms,
      },
    },
  };
}

/**
 * N167 — set the binding default flow in `taskflow.config.json`
 * (`flows.defaultFlow`). A new task with no explicit flow / entry-agent match /
 * type mapping binds to this — so a custom flow becomes the default WITHOUT
 * needing `entryAgents`. Writes the raw user config (preserving `byType`).
 */
export function setDefaultFlow(flowId: string, cwd: string = process.cwd()): void {
  const anchor = safeResolveProjectRoot(cwd) ?? cwd;
  const configPath = resolve(anchor, CONFIG_FILENAME);
  const raw: Partial<TaskflowConfig> = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, "utf-8")) as Partial<TaskflowConfig>)
    : {};
  raw.flows = { defaultFlow: flowId, byType: raw.flows?.byType ?? {} };
  writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n", "utf-8");
}

/**
 * N167 — if the default flow (or any `byType` mapping) points at `flowId`, reset
 * it to "default". Called after a flow is removed so no dangling default/binding
 * survives. Returns true if anything changed.
 */
export function clearFlowReferences(flowId: string, cwd: string = process.cwd()): boolean {
  const anchor = safeResolveProjectRoot(cwd) ?? cwd;
  const configPath = resolve(anchor, CONFIG_FILENAME);
  if (!existsSync(configPath)) return false;
  const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<TaskflowConfig>;
  if (!raw.flows) return false;
  let changed = false;
  if (raw.flows.defaultFlow === flowId) {
    raw.flows.defaultFlow = "default";
    changed = true;
  }
  if (raw.flows.byType) {
    for (const [type, mapped] of Object.entries(raw.flows.byType)) {
      if (mapped === flowId) {
        delete raw.flows.byType[type];
        changed = true;
      }
    }
  }
  if (changed) writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n", "utf-8");
  return changed;
}

export function getWorkDir(config: TaskflowConfig, cwd: string = process.cwd()): string {
  const anchor = safeResolveProjectRoot(cwd) ?? cwd;
  return resolveFlowRoot(anchor, config.workDir).tasksDir;
}

/**
 * Resolve a task's on-disk folder as `<workDir>/<basename of task.folder>`.
 *
 * `task.folder` is stored project-root-relative and its prefix varies by layout
 * era ("workTasks/Nxx-slug", "insightFlow/workTasks/Nxx-slug"), but task folders
 * are always direct children of the resolved tasks dir — so the basename joined
 * against the live workDir is canonical for every layout. Taking the basename
 * (rather than stripping a fixed prefix) is what prevents the doubled
 * `insightFlow/workTasks/workTasks/Nxx` path that the N101 layout exposed (N139).
 *
 * N140: single shared resolver — previously duplicated in storage.ts and spec.ts
 * with divergent argument orders, which is how they drifted in the first place.
 */
export function resolveTaskFolder(config: TaskflowConfig, task: Task, cwd?: string): string {
  const workDir = getWorkDir(config, cwd);
  const tail = task.folder.split(/[\\/]/).filter(Boolean).pop() ?? task.folder;
  return resolve(workDir, tail);
}

export function getEventsDir(config: TaskflowConfig, cwd: string = process.cwd()): string {
  const anchor = safeResolveProjectRoot(cwd) ?? cwd;
  return resolveFlowRoot(anchor, config.workDir).eventsDir;
}

export function getMasterPath(config: TaskflowConfig, cwd: string = process.cwd()): string {
  return resolve(getWorkDir(config, cwd), "master.json");
}

function safeResolveProjectRoot(cwd: string): string | null {
  try {
    return resolveProjectRoot(cwd);
  } catch {
    return null;
  }
}

function inferProjectName(cwd: string): string {
  try {
    const pkgPath = resolve(cwd, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return pkg.name;
    }
  } catch {
    // ignore
  }
  return basename(cwd);
}
