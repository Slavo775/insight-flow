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
  let hubProjects: { label: string; port: number; path: string }[] = [];
  if (!config.standalone) {
    hubProjects = migrateBatchUiIntoHub();
    for (const p of hubProjects) registry.seed(p.label, p.label, p.path);
  }

  const { close } = await startMasterServer(config);

  // N218 — reverse handshake: the master (fresh start / restart) probes each
  // registered project's /health at its known port and marks the reachable ones
  // online right away — so it controls liveness itself, without waiting for
  // projects to re-register (works even for older dashboards).
  void handshakeRegistered(hubProjects);
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

/**
 * N219 — reverse-registration handshake (Diagram 1). On boot the master asks
 * each registered project to register itself: `POST /hub/reregister` at its known
 * port. A running project re-registers against the master (fresh token + liveness
 * → online); a stopped project doesn't answer and the master does nothing; a
 * standalone project declines. The master never fabricates online state — it only
 * triggers the project's real registration. Best-effort, concurrent, short timeout.
 */
async function handshakeRegistered(
  projects: { label: string; port: number; path: string }[],
): Promise<void> {
  await Promise.all(
    projects.map(async (p) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        await fetch(`http://localhost:${p.port}/hub/reregister`, {
          method: "POST",
          signal: ctrl.signal,
        });
        clearTimeout(t);
      } catch {
        /* project not running / declined — stays offline */
      }
    }),
  );
}
