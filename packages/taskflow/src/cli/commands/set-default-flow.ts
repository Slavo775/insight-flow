import type { ParsedArgs } from "../../core/types.js";
import { setDefaultFlow } from "../../core/config.js";
import { mergedProjects } from "../../agents/user-registry.js";

/** Flow ids that exist: "default" plus any custom project flows. */
function knownFlows(): Set<string> {
  try {
    return new Set(Object.keys(mergedProjects()));
  } catch {
    return new Set(["default"]);
  }
}

/**
 * N167 — make a flow the binding default (`flows.defaultFlow`). New tasks then
 * bind to it without needing `entryAgents`. Validates the flow exists first.
 */
export function cmdSetDefaultFlow(opts: ParsedArgs): void {
  const flow = opts.flow as string | undefined;
  if (!flow) {
    console.error("--flow <flowId> is required");
    process.exit(1);
  }
  if (!knownFlows().has(flow)) {
    console.error(`unknown flow "${flow}" (expected "default" or an existing custom flow).`);
    process.exit(1);
  }
  setDefaultFlow(flow);
  console.log(JSON.stringify({ action: "default-flow-set", defaultFlow: flow }));
}
