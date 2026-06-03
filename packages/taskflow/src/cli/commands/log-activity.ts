import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TaskflowConfig, ParsedArgs } from "../../core/types.js";

export function cmdLogActivity(config: TaskflowConfig, opts: ParsedArgs): void {
  const activityCfg = config.activityEngine;
  if (activityCfg?.enabled === false) {
    process.exit(0);
  }

  const message = (opts._[0] as string) || "";
  const logFile = resolve(process.cwd(), activityCfg?.logFile ?? ".taskflow-activity.jsonl");
  const ts = new Date().toISOString();

  try {
    const line = JSON.stringify({ ts, tool: "Activity", action: "log", message });
    appendFileSync(logFile, line + "\n");
  } catch {
    // fire-and-forget — swallow all errors
  }
}
