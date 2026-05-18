import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { TaskflowConfig, ActivityEngineConfig } from "./types.js";

const CONFIG_FILENAME = "taskflow.config.json";

const ACTIVITY_DEFAULTS: ActivityEngineConfig = {
  enabled: true,
  logFile: ".taskflow-activity.jsonl",
  maxEvents: 200,
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
};

export function resolveConfig(cwd: string = process.cwd()): TaskflowConfig {
  const configPath = resolve(cwd, CONFIG_FILENAME);
  let userConfig: Partial<TaskflowConfig> = {};

  if (existsSync(configPath)) {
    userConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  const projectName =
    userConfig.projectName || inferProjectName(cwd) || "project";

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
  };
}

export function getWorkDir(config: TaskflowConfig, cwd: string = process.cwd()): string {
  return resolve(cwd, config.workDir);
}

export function getMasterPath(config: TaskflowConfig, cwd: string = process.cwd()): string {
  return resolve(getWorkDir(config, cwd), "master.json");
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
