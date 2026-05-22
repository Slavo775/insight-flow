import { installActivityHook } from "../activity-hook.js";
import type { TaskflowConfig, ParsedArgs } from "../types.js";

export function cmdInstallActivityHook(
  config: TaskflowConfig,
  opts: ParsedArgs = { _: [] },
  cwd: string = process.cwd(),
): void {
  // Match `insight-flow init`: if the project explicitly disabled the activity
  // engine in taskflow.config.json, refuse to install — running this command
  // should not silently override the user's config. `--force` escapes the
  // guard for the case where the user wants to install ahead of re-enabling.
  const force = !!opts.force;
  if (config.activityEngine?.enabled === false && !force) {
    console.error(
      "Activity engine disabled in taskflow.config.json (activityEngine.enabled: false). " +
        "Re-enable it in the config before running this command, or pass --force to install anyway.",
    );
    process.exit(1);
  }

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
