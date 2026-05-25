import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { TaskflowConfig, ActivityEngineConfig, NotificationsConfig } from "./types.js";
import { resolveProjectRoot } from "./paths.js";

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
  workDir: "workTasks",
  shardSize: 10,
  projectName: "",
  rolesDir: ".claude/roles",
  server: {
    port: 6006,
  },
  activityEngine: ACTIVITY_DEFAULTS,
  notifications: NOTIFICATION_DEFAULTS,
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

  const mergedAgentsGitPerms = {
    ...DEFAULTS.agents!.git!.permissions,
    ...(userConfig.agents?.git?.permissions ?? {}),
  };

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
  return resolve(anchor, config.workDir);
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
