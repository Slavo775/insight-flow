import { loadMasterConfig } from "./config.js";
import { startMasterServer } from "./server.js";
import * as registry from "./registry.js";
import { migrateBatchUiIntoHub } from "../core/global-config.js";
import {
  readMasterLock,
  writeMasterLock,
  clearMasterLock,
  checkMasterPidAlive,
  LOCK_PATH,
} from "./lock.js";

export { startMasterServer } from "./server.js";
export type { MasterServerConfig, MasterProjectState, MasterProjectEntry } from "./types.js";

/**
 * Run the multi-project overview server. Folded into the CLI as
 * `insight-flow master` (N81) — previously the standalone `insight-flow-master`
 * binary. Reads ~/.insight-flow/master.json, honors an optional port override,
 * and respects the single-instance lock.
 */
export async function runMaster(portOverride?: number): Promise<void> {
  const config = loadMasterConfig();
  if (typeof portOverride === "number" && portOverride > 0 && portOverride <= 65535) {
    config.port = portOverride;
  }

  const lock = readMasterLock();
  if (lock && checkMasterPidAlive(lock.pid)) {
    console.log(
      "insight-flow master is already running on port " + lock.port + " (pid " + lock.pid + ")",
    );
    return;
  }
  if (lock) clearMasterLock();

  // N213 — seed the overview from the persisted hub registry (folding in any
  // legacy bulk-ui entries) so registered projects show up before their
  // dashboards start. They reconcile to live entries when a dashboard registers.
  if (!config.standalone) {
    for (const p of migrateBatchUiIntoHub()) registry.seed(p.label, p.label, p.path);
  }

  const { close } = await startMasterServer(config);
  writeMasterLock(process.pid, config.port);

  const mode = config.standalone
    ? "standalone (registrations disabled)"
    : "accepting registrations";
  console.log("\n  insight-flow master\n");
  console.log("  Overview: http://localhost:" + config.port + "/overview");
  console.log("  Mode:     " + mode);
  console.log("  Lock:     " + LOCK_PATH);
  console.log("");

  function shutdown(): void {
    clearMasterLock();
    close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
