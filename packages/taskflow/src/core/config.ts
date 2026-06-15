import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { TaskflowConfig, ActivityEngineConfig, NotificationsConfig } from "./types.js";
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

export function getWorkDir(config: TaskflowConfig, cwd: string = process.cwd()): string {
  const anchor = safeResolveProjectRoot(cwd) ?? cwd;
  return resolveFlowRoot(anchor, config.workDir).tasksDir;
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
