import { loadMasterConfig } from "./config.js";
import { startMasterServer } from "./server.js";
import {
  readMasterLock,
  writeMasterLock,
  clearMasterLock,
  checkMasterPidAlive,
  LOCK_PATH,
} from "./lock.js";

async function main(): Promise<void> {
  const config = loadMasterConfig();

  // --port CLI arg overrides config file
  const portArgIdx = process.argv.indexOf("--port");
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p) && p > 0 && p <= 65535) {
      config.port = p;
    }
  }

  // Check lock file
  const lock = readMasterLock();
  if (lock && checkMasterPidAlive(lock.pid)) {
    console.log("insight-flow-master is already running on port " + lock.port + " (pid " + lock.pid + ")");
    process.exit(0);
  }
  if (lock) {
    clearMasterLock();
  }

  const { close } = await startMasterServer(config);

  writeMasterLock(process.pid, config.port);

  const mode = config.standalone ? "standalone (registrations disabled)" : "accepting registrations";
  console.log("\n  insight-flow-master\n");
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

main().catch((err: unknown) => {
  console.error("insight-flow-master failed to start:", err);
  process.exit(1);
});
