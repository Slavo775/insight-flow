import { installActivityHook } from "../activity-hook.js";
import type { TaskflowConfig } from "../types.js";

export function cmdInstallActivityHook(config: TaskflowConfig, cwd: string = process.cwd()): void {
  const logFile = config.activityEngine?.logFile || ".taskflow-activity.jsonl";
  const result = installActivityHook(cwd, logFile);

  if (!result.hookWritten && !result.settingsUpdated) {
    console.log(
      JSON.stringify({
        action: "install-activity-hook",
        result: "already-installed",
        hookPath: result.hookPath,
        settingsPath: result.settingsPath,
      }),
    );
    return;
  }

  console.log(
    JSON.stringify({
      action: "install-activity-hook",
      result: "installed",
      hookWritten: result.hookWritten,
      settingsUpdated: result.settingsUpdated,
      hookPath: result.hookPath,
      settingsPath: result.settingsPath,
    }),
  );
}
