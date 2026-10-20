import type { ParsedArgs, TaskflowConfig } from "../../core/types.js";
import { resolveProjectRoot } from "../../core/paths.js";
import { isHooksTrusted, trustHooks } from "../../core/trusted-hooks.js";

/**
 * N274 (A13) — review and approve this project's `events.hooks`. Shell commands
 * configured there run on lifecycle events; they execute only once their exact
 * set has been approved here. Prints the commands; `--yes` records approval,
 * otherwise it exits non-zero asking the human to re-run with `--yes`.
 */
export function cmdTrustHooks(config: TaskflowConfig, opts: ParsedArgs): void {
  const root = resolveProjectRoot();
  const hooks = (config.events?.hooks ?? {}) as Record<string, string[]>;
  const entries = Object.entries(hooks).filter(([, cmds]) => (cmds ?? []).length > 0);

  if (!entries.length) {
    console.log("No events.hooks configured in taskflow.config.json — nothing to trust.");
    return;
  }
  if (isHooksTrusted(root, hooks) && !opts.force) {
    console.log("events.hooks are already trusted for this project.");
    return;
  }

  console.log("These shell commands will run on the matching lifecycle events:\n");
  for (const [event, cmds] of entries) {
    for (const cmd of cmds) console.log(`  [${event}] ${cmd}`);
  }

  if (opts.yes) {
    trustHooks(root, hooks);
    console.log("\nApproved — these commands are now trusted for this project.");
  } else {
    console.log("\nReview the commands above, then re-run to approve:");
    console.log("  insight-flow trust-hooks --yes");
    process.exitCode = 1;
  }
}
