import { createServer } from "node:http";
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
  watch,
  mkdirSync,
  type FSWatcher,
} from "node:fs";
import { normalize, resolve, sep, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { exec, spawn } from "node:child_process";
import { Server as IOServer, type Socket as IOSocket } from "socket.io";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir } from "../config.js";
import { ActivityEngine, NoopActivityEngine } from "./activity.js";
import { getDashboardHtml } from "./dashboard.js";
import { detectActivityHookStatus, type ActivityHookStatus } from "../activity-hook.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const WATCH_DEBOUNCE_MS = 100;

/**
 * Inflate a shard JSON string with reviews/incidents loaded from each task's
 * side files. Falls back gracefully if a side file is absent or unreadable —
 * the dashboard sees the pre-split shape (`task.reviews`, `task.incidents`)
 * regardless of which storage schema is on disk.
 */
function hydrateShardJson(raw: string, workDir: string): string {
  let parsed: { tasks?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(raw) as { tasks?: Array<Record<string, unknown>> };
  } catch {
    return raw;
  }
  if (!parsed || !Array.isArray(parsed.tasks)) return raw;

  const workDirGuard = normalize(workDir) + sep;
  for (const task of parsed.tasks) {
    const folder = typeof task.folder === "string" ? task.folder : null;
    if (!folder) continue;
    const tail = folder.replace(/^.*?\//, "");
    const folderPath = normalize(resolve(workDir, tail));
    if (!folderPath.startsWith(workDirGuard) && folderPath !== normalize(workDir)) {
      task.reviews = Array.isArray(task.reviews) ? task.reviews : [];
      task.incidents = Array.isArray(task.incidents) ? task.incidents : [];
      continue;
    }

    if (!Array.isArray(task.reviews)) {
      const reviewsPath = resolve(folderPath, "reviews.json");
      if (existsSync(reviewsPath)) {
        try {
          const file = JSON.parse(readFileSync(reviewsPath, "utf-8")) as {
            reviews?: unknown[];
          };
          task.reviews = Array.isArray(file.reviews) ? file.reviews : [];
        } catch {
          task.reviews = [];
        }
      } else {
        task.reviews = [];
      }
    }

    if (!Array.isArray(task.incidents)) {
      const incidentsPath = resolve(folderPath, "incidents.json");
      if (existsSync(incidentsPath)) {
        try {
          const file = JSON.parse(readFileSync(incidentsPath, "utf-8")) as {
            incidents?: unknown[];
          };
          task.incidents = Array.isArray(file.incidents) ? file.incidents : [];
        } catch {
          task.incidents = [];
        }
      } else {
        task.incidents = [];
      }
    }
  }

  return JSON.stringify(parsed);
}

function listSubdirs(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => resolve(root, d.name));
  } catch {
    return [];
  }
}

interface WatchSession {
  close: () => void;
}

function watchWorkDir(workDir: string, onChange: () => void): WatchSession {
  const watchers = new Set<FSWatcher>();

  const platform = process.platform;
  if (platform === "darwin" || platform === "win32") {
    try {
      const w = watch(workDir, { recursive: true }, () => onChange());
      watchers.add(w);
      return {
        close: () => {
          for (const w2 of watchers) w2.close();
          watchers.clear();
        },
      };
    } catch {
      // fall through to per-subdir fallback if recursive isn't available
    }
  }

  const rootWatcher = watch(workDir, { recursive: false }, () => {
    onChange();
    refreshSubdirs();
  });
  watchers.add(rootWatcher);

  const subdirWatchers = new Map<string, FSWatcher>();

  function refreshSubdirs(): void {
    const subdirs = listSubdirs(workDir);
    const seen = new Set(subdirs);
    for (const [path, w] of subdirWatchers) {
      if (!seen.has(path)) {
        try { w.close(); } catch { /* ignore */ }
        subdirWatchers.delete(path);
        watchers.delete(w);
      }
    }
    for (const dir of subdirs) {
      if (subdirWatchers.has(dir)) continue;
      try {
        const w = watch(dir, { recursive: false }, () => onChange());
        subdirWatchers.set(dir, w);
        watchers.add(w);
      } catch {
        /* ignore unreadable folder */
      }
    }
  }

  refreshSubdirs();

  return {
    close: () => {
      for (const w of watchers) {
        try { w.close(); } catch { /* ignore */ }
      }
      watchers.clear();
      subdirWatchers.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Master server integration (N20)
// ---------------------------------------------------------------------------

const MASTER_LOCK_DIR = resolve(homedir(), ".insight-flow");
const MASTER_LOCK_PATH = resolve(MASTER_LOCK_DIR, "master.lock");

interface MasterLock { pid: number; port: number; }

function readMasterLock(): MasterLock | null {
  try { return JSON.parse(readFileSync(MASTER_LOCK_PATH, "utf-8")) as MasterLock; } catch { return null; }
}

function writeMasterLock(pid: number, port: number): void {
  mkdirSync(MASTER_LOCK_DIR, { recursive: true });
  writeFileSync(MASTER_LOCK_PATH, JSON.stringify({ pid, port, startedAt: new Date().toISOString() }, null, 2));
}

function clearMasterLock(): void {
  try { unlinkSync(MASTER_LOCK_PATH); } catch { /* ignore */ }
}

function isMasterPidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function findMasterBin(): string | null {
  const __dir = dirname(fileURLToPath(import.meta.url));
  // sibling package in workspace: packages/insight-flow-master/dist/index.js
  const siblingBin = resolve(__dir, "../../insight-flow-master/dist/index.js");
  if (existsSync(siblingBin)) return siblingBin;
  return null;
}

async function waitForMaster(port: number): Promise<boolean> {
  const url = `http://localhost:${port}/overview`;
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((r) => setTimeout(r, 300));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (res.ok || res.status === 404) return true;
    } catch { /* not ready */ }
  }
  return false;
}

async function registerWithMaster(masterUrl: string, label: string, projectUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${masterUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url: projectUrl }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: string };
    return data.id ?? null;
  } catch { return null; }
}

async function pushStateToMaster(
  masterUrl: string,
  id: string,
  state: Record<string, unknown>,
): Promise<number> {
  try {
    const res = await fetch(`${masterUrl}/api/projects/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      signal: AbortSignal.timeout(3000),
    });
    return res.status;
  } catch { return 0; }
}

function buildProjectState(
  config: TaskflowConfig,
  activity: ActivityEngine | NoopActivityEngine,
): Record<string, unknown> {
  const workDir = getWorkDir(config);
  let currentTaskId: string | null = null;
  let currentTaskTitle: string | null = null;
  let currentTaskStatus: string | null = null;
  const taskCounts: Record<string, number> = {};

  try {
    const masterJson = JSON.parse(
      readFileSync(resolve(workDir, "master.json"), "utf-8"),
    ) as { meta?: { currentTaskId?: string; shards?: string[] } };
    currentTaskId = masterJson.meta?.currentTaskId ?? null;

    for (const shardFile of masterJson.meta?.shards ?? []) {
      const shardPath = resolve(workDir, shardFile);
      if (!existsSync(shardPath)) continue;
      const shard = JSON.parse(readFileSync(shardPath, "utf-8")) as {
        tasks?: Array<{ id: string; title?: string; status: string }>;
      };
      for (const task of shard.tasks ?? []) {
        taskCounts[task.status] = (taskCounts[task.status] ?? 0) + 1;
        if (task.id === currentTaskId) {
          currentTaskTitle = task.title ?? null;
          currentTaskStatus = task.status;
        }
      }
    }
  } catch { /* ignore */ }

  return {
    currentTaskId,
    currentTaskTitle,
    currentTaskStatus,
    taskCounts,
    recentActivity: activity.getRecentEvents().slice(-50),
  };
}

let masterId: string | null = null;

async function setupMasterIntegration(
  config: TaskflowConfig,
  serverPort: number,
  activity: ActivityEngine | NoopActivityEngine,
): Promise<(() => void) | null> {
  const masterCfg = config.master;
  if (masterCfg?.standalone) return null;

  const masterUrl = masterCfg?.url ?? "http://localhost:6100";
  const masterPort = masterCfg?.port ?? 6100;
  const startLocally = masterCfg?.startMasterLocally !== false;

  // Auto-start master locally if needed
  if (startLocally) {
    const lock = readMasterLock();
    const running = lock && isMasterPidAlive(lock.pid);
    if (!running) {
      if (lock) clearMasterLock();
      const binPath = findMasterBin();
      if (binPath) {
        const child = spawn(process.execPath, [binPath, "--port", String(masterPort)], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        await waitForMaster(masterPort);
      } else {
        console.log("  [master] insight-flow-master binary not found, skipping auto-start");
        console.log("  [master] Run: pnpm --dir packages/insight-flow-master run build");
      }
    }
  }

  // Register with master
  const projectUrl = `http://localhost:${serverPort}`;
  masterId = await registerWithMaster(masterUrl, config.projectName, projectUrl);
  if (!masterId) {
    console.log("  [master] Could not register with master at " + masterUrl + " — overview disabled");
    return null;
  }

  console.log("  [master] Registered with " + masterUrl + " (id: " + masterId.slice(0, 8) + "...)");

  // Push initial state
  const state = buildProjectState(config, activity);
  void pushStateToMaster(masterUrl, masterId, state);

  // Return push function to call on file-change
  return async function pushOnChange(): Promise<void> {
    if (!masterId) return;
    const s = buildProjectState(config, activity);
    const status = await pushStateToMaster(masterUrl, masterId, s);
    if (status === 401) {
      masterId = await registerWithMaster(masterUrl, config.projectName, projectUrl);
      if (masterId) await pushStateToMaster(masterUrl, masterId, s);
    }
  };
}

export function startServer(config: TaskflowConfig, port?: number): void {
  const serverPort = port || config.server.port;
  const workDir = getWorkDir(config);
  const activityConfig = config.activityEngine ?? {
    enabled: false,
    logFile: ".taskflow-activity.jsonl",
    maxEvents: 200,
  };
  const activityLogPath = resolve(process.cwd(), activityConfig.logFile);

  if (!existsSync(workDir)) {
    console.error("Work directory not found: " + workDir);
    console.error("Run 'taskflow init' first.");
    process.exit(1);
  }

  const configEnabled = activityConfig.enabled !== false;
  const hookStatus: ActivityHookStatus = configEnabled
    ? detectActivityHookStatus(process.cwd())
    : "ok";

  const activity = configEnabled
    ? new ActivityEngine(activityLogPath, activityConfig)
    : new NoopActivityEngine();

  activity.start();

  // Master integration — runs async, non-blocking
  let pushToMaster: (() => void) | null = null;
  void setupMasterIntegration(config, serverPort, activity).then((fn) => {
    pushToMaster = fn;
  });

  const masterUrl = config.master?.url ?? "http://localhost:6100";

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // /overview — iframe proxy to master server
    if (url.pathname === "/overview") {
      if (config.master?.standalone) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Overview not available in standalone mode" }));
        return;
      }
      const iframeHtml =
        "<!DOCTYPE html><html><head><meta charset=\"UTF-8\">" +
        "<style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;overflow:hidden}</style>" +
        "</head><body>" +
        "<iframe src=\"" + masterUrl + "/overview\" style=\"width:100%;height:100vh;border:none;display:block\"></iframe>" +
        "</body></html>";
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(iframeHtml);
      return;
    }

    if (url.pathname === "/api/work-tasks") {
      try {
        const files = readdirSync(workDir).filter((f) => f.endsWith(".json"));
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify(files));
      } catch {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Failed to list files" }));
      }
      return;
    }

    if (url.pathname.startsWith("/api/work-tasks/")) {
      const fileName = url.pathname.replace("/api/work-tasks/", "");
      if (fileName.includes("..") || fileName.includes("/")) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Invalid filename" }));
        return;
      }
      const filePath = resolve(workDir, fileName);
      if (!existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "File not found" }));
        return;
      }
      try {
        const content = readFileSync(filePath, "utf-8");
        if (/^tasks-N\d+-N\d+\.json$/.test(fileName)) {
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(hydrateShardJson(content, workDir));
        } else {
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(content);
        }
      } catch {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Failed to read file" }));
      }
      return;
    }

    if (url.pathname === "/api/activity") {
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify(activity.getRecentEvents()));
      return;
    }

    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(getDashboardHtml(config));
  });

  // Socket.IO replaces the hand-rolled WS upgrade handler. It transparently
  // falls back to long-polling if the WebSocket handshake fails for any
  // reason (browser quirks, proxies, NAT), and handles reconnection /
  // heartbeat automatically. Path /socket.io is the default and is what the
  // socket.io-client library expects.
  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET"] },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on("connection", (sock: IOSocket) => {
    sock.emit("snapshot", {
      activity: activity.getRecentEvents(),
      hookStatus,
      configEnabled,
    });
  });

  let activityDebounceTimer: NodeJS.Timeout | null = null;
  activity.onEvent((event) => {
    io.emit("activity", event);
    // Debounce master push so rapid tool events don't flood it
    if (activityDebounceTimer) clearTimeout(activityDebounceTimer);
    activityDebounceTimer = setTimeout(() => {
      activityDebounceTimer = null;
      if (pushToMaster) void pushToMaster();
    }, 2000);
  });

  let debounceTimer: NodeJS.Timeout | null = null;
  function scheduleFileChangeBroadcast(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      io.emit("file-change", null);
      if (pushToMaster) void pushToMaster();
    }, WATCH_DEBOUNCE_MS);
  }

  const watcher = watchWorkDir(workDir, scheduleFileChangeBroadcast);

  server.listen(serverPort, () => {
    const engineStatus = configEnabled ? "Activity engine ON" : "Activity engine OFF";
    console.log("\n  Taskflow Dashboard\n");
    console.log("  Local:   http://localhost:" + serverPort);
    console.log("  Data:    " + workDir);
    console.log("  Live:    Socket.IO at /socket.io (WS + long-poll fallback)");
    console.log("  Engine:  " + engineStatus);
    if (configEnabled) {
      console.log("  Hook:    " + hookStatus);
    }
    if (!config.master?.standalone) {
      console.log("  Overview: http://localhost:" + serverPort + "/overview");
    }
    console.log("");

    const openCmd =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(openCmd + " http://localhost:" + serverPort);
  });

  process.on("SIGINT", () => {
    activity.stop();
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    io.close();
    try {
      if (existsSync(activityLogPath)) unlinkSync(activityLogPath);
    } catch {
      // ignore
    }
    server.close();
    process.exit(0);
  });
}
