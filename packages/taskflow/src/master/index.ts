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
 * N218 — probe each registered project's `/health` at its known port and, for
 * those that are genuinely an insight-flow dashboard (status "ok"), mark them
 * online with their live url. Best-effort, concurrent, short timeout; no timer.
 */
async function handshakeRegistered(
  projects: { label: string; port: number; path: string }[],
): Promise<void> {
  await Promise.all(
    projects.map(async (p) => {
      const url = `http://localhost:${p.port}`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        const r = await fetch(`${url}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) return;
        const body = (await r.json().catch(() => ({}))) as { status?: string };
        if (body.status === "ok") registry.markUp(p.label, url);
      } catch {
        /* project not running — stays offline */
      }
    }),
  );
}
