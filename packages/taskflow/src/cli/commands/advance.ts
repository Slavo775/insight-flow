// N133 — `insight-flow advance --id <id> --agent <agentId>`: advance a task
// through its flow. Reads the agent's status-transition module (N128) for the
// target status, then writes it through the flow-validated setter (N131). This
// is how a custom flow's agents emit that flow's custom statuses without
// hardcoded literals; the role prompt (composeAgent) tells the agent to run it.
import type { MasterFile, TaskflowConfig, ParsedArgs } from "../../core/types.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { getWorkDir, resolveId } from "../../core/storage.js";
import { writeStatus } from "./status-write.js";
import { transitionTargetFor } from "../../agents/transitions.js";

export function cmdAdvance(config: TaskflowConfig, master: MasterFile, opts: ParsedArgs): void {
  const id = resolveId(master, opts.id as string);
  const agent = opts.agent as string;
  if (!agent) {
    console.error("--agent is required (the agent whose transition to apply)");
    process.exit(1);
  }

  const { task, shard, shardFile } = jsonFileStorage.loadTaskById(config, master, id);
  const target = transitionTargetFor(agent, task.status);
  if (!target) {
    console.error(
      `No status-transition module for agent '${agent}' from status '${task.status}'. ` +
        `Add a status-transition module (kind: status-transition) to the agent.`,
    );
    process.exit(1);
  }

  // The setter validates the target against the task's flow (N131); an
  // InvalidStatusTransitionError surfaces cleanly via the cli top-level handler.
  writeStatus(task, target, agent);
  jsonFileStorage.saveShard(getWorkDir(config), shardFile, shard);
  console.log(JSON.stringify({ action: "advanced", id, agent, status: target }));
}
