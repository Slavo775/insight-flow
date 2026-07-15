import { createServer, get as httpGet, type IncomingMessage, type ServerResponse } from "node:http";
import {
  readFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
  statSync,
  watch,
  type FSWatcher,
} from "node:fs";
import { normalize, resolve, sep, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { exec, spawn } from "node:child_process";
import { SseTransport, type Transport } from "./transport.js";
import type { TaskflowConfig, HookEventInput, ActivityEvent } from "../../core/types.js";
import { getWorkDir, setDefaultFlow } from "../../core/config.js";
import { claudeStatusFromProjectStatus } from "../../core/activity-status.js";
import { ActivityEngine, NoopActivityEngine } from "./activity.js";
import { getNavHtml, getNavCss, getConfigPageHtml } from "./dashboard.js";
import {
  detectActivityHookStatus,
  type ActivityHookStatus,
  BUNDLED_HOOKS_VERSION,
} from "../../agents/activity-hook.js";
import { EventStore } from "./event-stream.js";
import { HookEventInputSchema } from "../../core/schema/index.js";
import { recordHookEvent } from "../../core/observability/langfuse.js";
import { jsonFileStorage } from "../../core/storage-port.js";
import { setTaskFlow } from "../../cli/commands/set-flow.js";
import {
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
  type AgentModule,
  type ComposedAgent,
} from "../../agents/compose.js";
import { DEFAULT_PROJECT, BUILTIN_PROJECTS, isBuiltinProjectId } from "../../agents/project.js";
import {
  targetArtifacts,
  planFromArtifacts,
  inputsFromArtifacts,
  targetBucketId,
  NotInstallableError,
  UnknownTargetError,
  type InstallTarget,
  type TargetKind,
} from "../../agents/flow-install.js";
import {
  applyArtifacts,
  uninstallPlan,
  uninstallTarget,
  InstallConflictError,
  restoreMcpServer,
} from "../../agents/emit.js";
import { resolveProjectRoot } from "../../core/paths.js";
import { writeServerPortPointer, clearServerPortPointer } from "../../core/global-config.js";
import { readSecrets, writeSecrets, ensureGitignored, scrubSecrets } from "../../core/secrets.js";
import { loadUserRegistries } from "../../agents/user-registry.js";
import { definitionRevision, handleCustomDefsRequest } from "./custom-defs.js";
import type { Project } from "../../agents/project.js";

// N172 — prior `.mcp.json` server entries captured (server-side, unscrubbed)
// before a force overwrite, keyed by server name; drained by /api/mcp-restore.
const overwriteSnapshots = new Map<string, unknown>();

/** N108/N194 — shipped built-in flows + user-space flows; degrades to built-ins only. */
function mergedProjectsView(): Record<string, Project> {
  try {
    return { ...BUILTIN_PROJECTS, ...loadUserRegistries().projects };
  } catch {
    return { ...BUILTIN_PROJECTS };
  }
}

/**
 * N102 — built-ins + the project's user-space registries, loaded per call so
 * file changes appear without a restart. A broken user space never kills the
 * read APIs: degrade to built-ins and surface the error message.
 */
function mergedView(): {
  modules: Record<string, AgentModule>;
  agents: Record<string, ComposedAgent>;
  userSpaceError?: string;
} {
  try {
    const user = loadUserRegistries();
    return {
      modules: { ...MODULE_REGISTRY, ...user.modules },
      agents: { ...COMPOSED_AGENTS, ...user.agents },
    };
  } catch (err) {
    return {
      modules: MODULE_REGISTRY,
      agents: COMPOSED_AGENTS,
      userSpaceError: (err as Error).message,
    };
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  // N85: assets emitted by the Vite dashboard build (dist/dashboard).
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

// N85: the Vite-built dashboard SPA ships in dist/dashboard alongside the bundled
// cli.js (import.meta.url resolves to dist/ at runtime), served on the same port.
const DASHBOARD_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "dashboard");

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
    // Folder prefixes vary by layout era ("workTasks/...", "insightFlow/workTasks/...");
    // the basename against the live workDir is canonical (N101).
    const tail = folder.split(/[\\/]/).filter(Boolean).pop() ?? folder;
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
        try {
          w.close();
        } catch {
          /* ignore */
        }
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
        try {
          w.close();
        } catch {
          /* ignore */
        }
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

interface MasterLock {
  pid: number;
  port: number;
}

function readMasterLock(): MasterLock | null {
  try {
    return JSON.parse(readFileSync(MASTER_LOCK_PATH, "utf-8")) as MasterLock;
  } catch {
    return null;
  }
}

function clearMasterLock(): void {
  try {
    unlinkSync(MASTER_LOCK_PATH);
  } catch {
    /* ignore */
  }
}

function isMasterPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findMasterBin(): string | null {
  // N81: the master server is folded into this package and runs via the
  // `insight-flow master` subcommand. This file is bundled into dist/cli.js,
  // so the CLI bin sits right beside it — works both in-repo and installed.
  const __dir = dirname(fileURLToPath(import.meta.url));
  const selfBin = resolve(__dir, "cli.js");
  if (existsSync(selfBin)) return selfBin;
  return null;
}

async function waitForMaster(port: number): Promise<boolean> {
  const url = `http://localhost:${port}/overview`;
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((r) => setTimeout(r, 300));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (res.ok || res.status === 404) return true;
    } catch {
      /* not ready */
    }
  }
  return false;
}

function pushStatusToMaster(masterUrl: string, id: string, token: string, status: string): void {
  void fetch(`${masterUrl}/api/projects/${id}/status?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}

async function registerWithMaster(
  masterUrl: string,
  projectId: string,
  label: string,
  projectUrl: string,
  path?: string,
): Promise<{ id: string; token: string } | null> {
  try {
    const res = await fetch(`${masterUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, label, url: projectUrl, path }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string; token?: string };
    return data.id && data.token ? { id: data.id, token: data.token } : null;
  } catch {
    return null;
  }
}

async function pushStateToMaster(
  masterUrl: string,
  id: string,
  token: string,
  state: Record<string, unknown>,
): Promise<number> {
  try {
    const res = await fetch(
      `${masterUrl}/api/projects/${id}/update?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
        signal: AbortSignal.timeout(3000),
      },
    );
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * N214 — hold a passive liveness connection to the master so it can mark this
 * project online while the connection is open and offline the moment it drops.
 * Reconnects with capped backoff; stops when a re-register mints a new token.
 */
function holdLiveness(
  masterUrl: string,
  id: string,
  token: string,
  reregister: () => Promise<boolean>,
): void {
  // N219 review-fix — claim the active slot and close any prior connection, so
  // there is never more than one open `/api/hub/live`. A loop is superseded once
  // a newer holdLiveness() bumps the epoch (or the token changes); superseded
  // loops must NOT reconnect. Keyed on epoch, not just token, because a
  // reconciled re-register returns the SAME token — token equality alone would
  // fail to supersede the old loop.
  const myEpoch = ++livenessEpoch;
  if (activeLivenessReq) {
    try {
      activeLivenessReq.destroy();
    } catch {
      /* already gone */
    }
    activeLivenessReq = null;
  }
  const superseded = (): boolean => myEpoch !== livenessEpoch || masterToken !== token;
  let attempts = 0;
  const reconnect = (): void => {
    if (superseded()) return;
    attempts += 1;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
    setTimeout(connect, delay).unref();
  };
  const connect = (): void => {
    if (superseded()) return;
    const liveUrl = `${masterUrl}/api/hub/live?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      reconnect();
    };
    const req = httpGet(liveUrl, (res) => {
      if (res.statusCode === 200) {
        attempts = 0;
      } else if (res.statusCode === 401) {
        // N218 — the master no longer knows us (it restarted with a fresh
        // registry / new tokens). Re-register instead of retrying a dead token;
        // on success a new liveness loop starts and this one is superseded.
        settled = true;
        res.resume();
        void reregister().then((ok) => {
          if (!ok) reconnect();
        });
        return;
      }
      res.on("data", () => {});
      res.on("end", done);
      res.on("error", done);
    });
    activeLivenessReq = req;
    req.on("error", done);
    req.setTimeout(0);
  };
  connect();
}

/**
 * N227 — project an activity-feed "Event" row (hook-sourced) onto the
 * {@link HookEventInput} the {@link EventStore} derives status from. Non-Event
 * rows (Tool / Skill / Phase) carry no hook-level state and return null. Shared
 * by the startup seed loop and the live `activity.onEvent` handler so both
 * funnel through the same `statusFromEvent` vocabulary.
 */
function activityRowToHookEvent(event: ActivityEvent, seq: number): HookEventInput | null {
  if (event.tool !== "Event" || typeof event.action !== "string") return null;
  return {
    id: `act_${event.ts}_${seq}`,
    timestamp: event.ts,
    // Pass the dash-case derived action directly; `statusFromEvent` accepts both
    // the raw Claude/Cursor hook names and these derived names.
    type: event.action,
    payload: {},
  };
}

function buildProjectState(
  config: TaskflowConfig,
  activity: ActivityEngine | NoopActivityEngine,
  eventStore: EventStore,
): Record<string, unknown> {
  const workDir = getWorkDir(config);
  let currentTaskId: string | null = null;
  let currentTaskTitle: string | null = null;
  let currentTaskStatus: string | null = null;
  const taskCounts: Record<string, number> = {};

  try {
    const masterJson = JSON.parse(readFileSync(resolve(workDir, "master.json"), "utf-8")) as {
      meta?: { currentTaskId?: string; shards?: string[] };
    };
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
  } catch {
    /* ignore */
  }

  return {
    currentTaskId,
    currentTaskTitle,
    currentTaskStatus,
    taskCounts,
    recentActivity: activity.getRecentEvents().slice(-50),
    // N227 — the authoritative agent status so the master overview renders the
    // same value as the dashboard instead of re-deriving it from recentActivity.
    agentStatus: claudeStatusFromProjectStatus(eventStore.getStatus()),
  };
}

let masterId: string | null = null;
let masterToken: string | null = null;
// N219 — exposed so the `POST /hub/reregister` route (the master's boot
// handshake, Diagram 1) can trigger a real re-register. Null until master
// integration is set up, or when running standalone.
let masterReregister: (() => Promise<boolean>) | null = null;
// N219 review-fix (blocker 1) — guarantee at most ONE liveness connection is
// ever open. Each holdLiveness() claims a new epoch and tears down the prior
// open request; older-epoch loops stop instead of reconnecting. Without this,
// repeatedly triggering re-register (e.g. via /hub/reregister) leaked one open
// `/api/hub/live` connection + heartbeat per call on both project and master.
let livenessEpoch = 0;
let activeLivenessReq: ReturnType<typeof httpGet> | null = null;

async function setupMasterIntegration(
  config: TaskflowConfig,
  serverPort: number,
  activity: ActivityEngine | NoopActivityEngine,
  eventStore: EventStore,
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
        const child = spawn(process.execPath, [binPath, "master", "--port", String(masterPort)], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        await waitForMaster(masterPort);
      } else {
        console.log("  [master] insight-flow CLI not found, skipping overview auto-start");
      }
    }
  }

  // Register with master (N214 — send our project path so the hub can reconcile
  // a seeded/bulk-ui entry by path, and receive our per-project token).
  const projectUrl = `http://localhost:${serverPort}`;
  let projectPath: string | undefined;
  try {
    projectPath = resolveProjectRoot();
  } catch {
    projectPath = undefined;
  }
  const reg = await registerWithMaster(
    masterUrl,
    config.projectName,
    config.projectName,
    projectUrl,
    projectPath,
  );
  if (!reg) {
    console.log(
      "  [master] Could not register with master at " + masterUrl + " — overview disabled",
    );
    return null;
  }
  masterId = reg.id;
  masterToken = reg.token;

  console.log("  [master] Registered with " + masterUrl + " (id: " + masterId.slice(0, 8) + "...)");

  // N218 — re-register when the master stops recognizing us (it restarted): a
  // fresh register, restart the liveness loop, re-push state, so a running
  // dashboard comes back online after a master restart.
  //
  // N219 review-fix (blocker 1) — single-flight + throttle. Concurrent callers
  // (the liveness-401 path AND the /hub/reregister route can both fire) share
  // one in-flight registration; a successful re-register within the cooldown
  // short-circuits to `true` (the token is already fresh + a liveness loop is
  // live), so hammering /hub/reregister no longer spawns a register + liveness
  // connection per call.
  let reregisterInFlight: Promise<boolean> | null = null;
  let lastReregisterOkAt = 0;
  const REREGISTER_COOLDOWN_MS = 5000;
  const reregister = async (): Promise<boolean> => {
    if (reregisterInFlight) return reregisterInFlight;
    if (Date.now() - lastReregisterOkAt < REREGISTER_COOLDOWN_MS) return true;
    reregisterInFlight = (async () => {
      const r = await registerWithMaster(
        masterUrl,
        config.projectName,
        config.projectName,
        projectUrl,
        projectPath,
      );
      if (!r) return false;
      masterId = r.id;
      masterToken = r.token;
      holdLiveness(masterUrl, masterId, masterToken, reregister);
      void pushStateToMaster(
        masterUrl,
        masterId,
        masterToken,
        buildProjectState(config, activity, eventStore),
      );
      // N240 — re-push the raw claudeStatus on reconnect too. A fresh registration
      // (after a master restart/crash) resets the master's registry claudeStatus to
      // null, and pushStateToMaster only carries `agentStatus`. hub-notify.js reads
      // `claudeStatus`, so without this it stays null and "Claude finished" / "needs
      // permission" notifications never fire for a reconnected project until the next
      // live transition. Mirrors the initial-registration push below.
      pushStatusToMaster(masterUrl, masterId, masterToken, eventStore.getStatus());
      return true;
    })();
    try {
      const ok = await reregisterInFlight;
      if (ok) lastReregisterOkAt = Date.now();
      return ok;
    } finally {
      reregisterInFlight = null;
    }
  };

  // N219 — let the `/hub/reregister` route drive this same closure.
  masterReregister = reregister;

  // N214 — hold the passive liveness connection (online while open).
  holdLiveness(masterUrl, masterId, masterToken, reregister);

  // Push initial state
  const state = buildProjectState(config, activity, eventStore);
  void pushStateToMaster(masterUrl, masterId, masterToken, state);
  // N227 — push the real seeded status (not a hardcoded "idle") so the master
  // reflects an already-active agent from the first registration.
  let lastPushedStatus = eventStore.getStatus();
  pushStatusToMaster(masterUrl, masterId, masterToken, lastPushedStatus);

  // N238 — the status push is transition-only, so the stuck-active decay (an
  // `active` turn gone silent past STUCK_ACTIVE_MS → idle) would never reach the
  // hub without a tick. Poll getStatus() and push on change. unref() so it never
  // keeps the process alive.
  setInterval(() => {
    if (!masterId || !masterToken) return;
    const now = eventStore.getStatus();
    if (now !== lastPushedStatus) {
      lastPushedStatus = now;
      pushStatusToMaster(masterUrl, masterId, masterToken, now);
    }
  }, 60_000).unref();

  // Return push function to call on file-change
  return async function pushOnChange(): Promise<void> {
    if (!masterId || !masterToken) return;
    const s = buildProjectState(config, activity, eventStore);
    const status = await pushStateToMaster(masterUrl, masterId, masterToken, s);
    if (status === 401) {
      if (await reregister()) {
        await pushStateToMaster(masterUrl, masterId!, masterToken!, s);
      }
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

  const configEnabled = activityConfig.enabled === true;
  const hookStatus: ActivityHookStatus = configEnabled
    ? detectActivityHookStatus(process.cwd())
    : "ok";

  const activity = configEnabled
    ? new ActivityEngine(activityLogPath, activityConfig)
    : new NoopActivityEngine();

  activity.start();

  // N68: in-memory hook-event store driving derived project status.
  const eventStore = new EventStore();

  // N227 — seed the status store from the durable activity feed (N225) that
  // `activity.start()` just restored, so the derived active/idle status is
  // correct on the very first dashboard load / master push instead of
  // defaulting to "idle" until the next live event arrives. `activitySeq` then
  // continues past the seeded rows for the live `activity.onEvent` handler.
  let activitySeq = 0;
  for (const ev of activity.getRecentEvents()) {
    const synthetic = activityRowToHookEvent(ev, activitySeq);
    if (synthetic) {
      eventStore.insert(synthetic);
      activitySeq++;
    }
  }

  const masterUrl = config.master?.url ?? "http://localhost:6100";

  // Master integration — runs async, non-blocking
  let pushToMaster: (() => void) | null = null;
  void setupMasterIntegration(config, serverPort, activity, eventStore).then((fn) => {
    pushToMaster = fn;
  });

  // N151 — the request dispatch lives in a named function so the createServer
  // callback can wrap it in a handler-wide error boundary (below).
  function dispatch(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    // N83: native SSE stream (replaced socket.io). Hand matching requests off
    // to the transport, which takes over the response and keeps it open.
    if (transport.handleRequest(req, res)) return;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");

    // N214/N218 — GET /health: liveness + identity, always readable (localhost).
    // The master's startup handshake probes this WITHOUT our token (a fresh
    // master doesn't know it yet), so it must always answer with who we are; the
    // `authed` flag just notes whether the caller's token matched.
    if (url.pathname === "/health") {
      const token = url.searchParams.get("token");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: "ok",
          projectName: config.projectName,
          authed: !masterToken || token === masterToken,
        }),
      );
      return;
    }

    // N219 — POST /hub/reregister: the master's boot handshake (Diagram 1) asks
    // this project to register itself. We run the real re-register (single-flight
    // + throttled, restarts liveness); a standalone project — or one whose master
    // integration never came up — declines. Either way the master takes no further
    // action; online state comes from the real register + the liveness channel,
    // never a fabricated mark.
    //
    // N219 review-fix (blocker 2) — this is a control-plane endpoint for the
    // master (a server-to-server Node fetch), never for a browser. Reject:
    //   - non-loopback callers (`req.socket.remoteAddress`), and
    //   - any request carrying browser fetch-metadata (`Origin` /
    //     `Sec-Fetch-Site`) — a CSRF POST from a page the user has open would
    //     otherwise pass the loopback gate. The master's Node fetch sends
    //     neither header, so the real handshake is unaffected.
    // The master proxy is separately blocked from forwarding `/hub/*` (so a LAN
    // peer can't reach this via `/p/<id>/hub/reregister`).
    if (url.pathname === "/hub/reregister" && req.method === "POST") {
      const remote = req.socket.remoteAddress ?? "";
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
        res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "reregister is localhost-only" }));
        return;
      }
      const secFetchSite = req.headers["sec-fetch-site"];
      if (req.headers.origin || (secFetchSite && secFetchSite !== "none")) {
        res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "cross-site request refused" }));
        return;
      }
      if (config.master?.standalone || !masterReregister) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ declined: true }));
        return;
      }
      void masterReregister();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // N85: React dashboard (Vite build in dist/dashboard), served on the same
    // port. Hashed assets at /assets/*; the SPA shell is served by the catch-all
    // fallthrough at the end of this handler (so / and any client route resolve
    // to it). API/SSE/config/overview routes return before reaching it.
    if (url.pathname.startsWith("/assets/")) {
      const assetPath = resolve(DASHBOARD_DIR, url.pathname.replace(/^\/+/, ""));
      if (assetPath !== DASHBOARD_DIR && !assetPath.startsWith(DASHBOARD_DIR + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const data = readFileSync(assetPath);
        const ext = assetPath.slice(assetPath.lastIndexOf("."));
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // N85: read-only markdown for a task's generated docs. `folder` is the task's
    // tracker folder (e.g. workTasks/N85-...); resolved against cwd and required
    // to stay inside workDir (traversal guard). Names are whitelisted.
    if (url.pathname === "/api/task-doc") {
      const DOC_WHITELIST: Record<string, string> = {
        TASK: "TASK.md",
        CHECKLIST: "CHECKLIST.md",
        REVIEW: "REVIEW.md",
        ANALYSIS: "ANALYSIS.md",
      };
      const fileName = DOC_WHITELIST[url.searchParams.get("name") || ""];
      const folder = url.searchParams.get("folder") || "";
      if (!fileName) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "name must be one of TASK|CHECKLIST|REVIEW|ANALYSIS" }));
        return;
      }
      // Resolve via the live workDir + folder basename so pre-migration folder
      // values ("workTasks/Nxx-...") keep working after migrate-layout (N101).
      const folderTail = folder.split(/[\\/]/).filter(Boolean).pop() ?? "";
      const docPath = resolve(workDir, folderTail, fileName);
      if (docPath !== workDir && !docPath.startsWith(workDir + sep)) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "folder outside work directory" }));
        return;
      }
      if (!existsSync(docPath)) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: fileName + " not found" }));
        return;
      }
      try {
        res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
        res.end(readFileSync(docPath, "utf-8"));
      } catch {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Failed to read doc" }));
      }
      return;
    }

    // /config — project config viewer
    if (url.pathname === "/config") {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(getConfigPageHtml(config));
      return;
    }

    // /overview — iframe proxy to master server
    if (url.pathname === "/overview") {
      if (config.master?.standalone) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Overview not available in standalone mode" }));
        return;
      }
      const overviewCss =
        "*{margin:0;padding:0;box-sizing:border-box}" +
        "html,body{height:100%;background:#0a0a0a;font-family:'SF Mono','Fira Code',monospace;}" +
        ":root{--bg:#0a0a0a;--surface:#141414;--border:#262626;--text:#e5e5e5;--text-muted:#737373;--accent:#3b82f6}" +
        getNavCss() +
        ".top-nav{margin:0;top:0;}";
      const iframeHtml =
        '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        "<style>" +
        overviewCss +
        "</style>" +
        "</head><body>" +
        getNavHtml(config.projectName || "", "overview") +
        '<iframe src="' +
        masterUrl +
        '/overview" style="width:100%;height:calc(100vh - 48px);border:none;display:block"></iframe>' +
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

    if (url.pathname === "/api/config") {
      // TaskflowConfig has no sensitive fields; if a secret key is ever added,
      // filter it here before serialising rather than relying on CORS alone.
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify(config, null, 2));
      return;
    }

    // N172 — undo an install overwrite: restore a `.mcp.json` server entry to its
    // prior config. POST { name, config }.
    if (url.pathname === "/api/mcp-restore" && req.method === "POST") {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString("utf-8")));
      req.on("end", () => {
        try {
          const { name } = JSON.parse(body || "{}") as { name?: string };
          if (!name) {
            res.writeHead(400, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: "name is required" }));
            return;
          }
          // N172 — restore from the server-side snapshot (the real prior value),
          // not the client's secret-scrubbed copy. No snapshot ⇒ nothing to undo.
          if (!overwriteSnapshots.has(name)) {
            res.writeHead(409, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: `no overwrite to undo for '${name}'` }));
            return;
          }
          const action = restoreMcpServer(resolveProjectRoot(), name, overwriteSnapshots.get(name));
          overwriteSnapshots.delete(name);
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, name, action }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
        }
      });
      return;
    }

    // N167 — set the binding default flow (so new tasks use a custom flow without
    // needing entryAgents). POST { flowId }. Validates the flow exists.
    if (url.pathname === "/api/default-flow" && req.method === "POST") {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString("utf-8")));
      req.on("end", () => {
        try {
          const flowId = (JSON.parse(body || "{}") as { flowId?: string }).flowId;
          if (!flowId || !mergedProjectsView()[flowId]) {
            res.writeHead(400, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: `unknown flow '${flowId ?? ""}'` }));
            return;
          }
          setDefaultFlow(flowId);
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, defaultFlow: flowId }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
        }
      });
      return;
    }

    // N96 — the project layer: agents, flow edges, global install.
    // N108 — `?id=` selects any flow from the merged view (default when absent,
    // keeping N96/N104 consumers untouched); /api/projects lists them all.
    if (url.pathname === "/api/project") {
      const { modules: moduleRegistry, agents: composedAgents } = mergedView();
      const projects = mergedProjectsView();
      const requestedId = url.searchParams.get("id") ?? DEFAULT_PROJECT.id;
      const project = projects[requestedId];
      if (!project) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: `unknown project '${requestedId}'` }));
        return;
      }
      const agentTitle = (id: string): string => composedAgents[id]?.title ?? id;
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(
        JSON.stringify({
          ...project,
          source: isBuiltinProjectId(project.id) ? "builtin" : "custom",
          // N121 — true when a user-space override file shadows a shipped def
          // (drives the "Revert to shipped" affordance for a built-in flow).
          ejected: definitionRevision("projects", project.id) !== null,
          // N111 — optimistic-concurrency token; PUTs echo it via x-revision.
          revision: isBuiltinProjectId(project.id)
            ? undefined
            : (definitionRevision("projects", project.id) ?? undefined),
          agentTitles: Object.fromEntries(project.agents.map((a) => [a, agentTitle(a)])),
          installModules: project.install.map((id) => {
            const mod = moduleRegistry[id];
            return { id, title: mod?.title ?? id, kind: mod?.kind ?? "unknown" };
          }),
        }),
      );
      return;
    }

    // N174 — install plan for any target (flow | agent | module): the mcp / hook /
    // skill / command artifacts it would write + the `${VAR}` inputs to collect.
    // A module of a non-installable kind (section/include/…) → 400; unknown id → 404.
    if (url.pathname === "/api/install-plan" && (req.method ?? "GET") === "GET") {
      const kind = (url.searchParams.get("kind") ?? "") as TargetKind;
      const id = url.searchParams.get("id") ?? "";
      if (!["flow", "agent", "module"].includes(kind) || !id) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "kind (flow|agent|module) and id are required" }));
        return;
      }
      const target: InstallTarget = { kind, id };
      try {
        // Compose the target once; derive both the plan and the required inputs.
        const art = targetArtifacts(target);
        const stored = readSecrets(resolveProjectRoot());
        const reqInputs = inputsFromArtifacts(art).map((inp) => ({
          ...inp,
          saved: Boolean(stored[inp.name] && stored[inp.name].length > 0),
        }));
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(
          JSON.stringify({ kind, id, plan: planFromArtifacts(art), requiredInputs: reqInputs }),
        );
      } catch (err) {
        const status =
          err instanceof NotInstallableError ? 400 : err instanceof UnknownTargetError ? 404 : 500;
        res.writeHead(status, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
      return;
    }

    // N174 — run the install plan for any target, over the target's manifest
    // bucket: `${VAR}` input resolution, conflict (409), N172 force snapshot, and
    // per-step SSE progress.
    if (url.pathname === "/api/install" && req.method === "POST") {
      let body = "";
      let aborted = false;
      req.on("data", (chunk: Buffer) => {
        if (aborted) return;
        body += chunk.toString("utf-8");
        if (body.length > 16 * 1024) {
          aborted = true;
          res.writeHead(413, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "payload too large" }));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (aborted) return;
        let secretValues: string[] = [];
        try {
          const parsed = body
            ? (JSON.parse(body) as {
                kind?: TargetKind;
                id?: string;
                values?: Record<string, string>;
                force?: boolean;
              })
            : {};
          const kind = parsed.kind as TargetKind;
          const id = parsed.id ?? "";
          if (!["flow", "agent", "module"].includes(kind) || !id) {
            res.writeHead(400, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: "kind and id are required" }));
            return;
          }
          const target: InstallTarget = { kind, id };
          const projectRoot = resolveProjectRoot();

          // Compose the target once; reuse for inputs, snapshot, plan, and apply.
          const artifacts = targetArtifacts(target);

          // N165 — resolve `${VAR}` inputs (submitted win over stored; new ones
          // persist gitignored so a re-install doesn't re-prompt).
          const required = inputsFromArtifacts(artifacts);
          const submitted = parsed.values ?? {};
          const stored = readSecrets(projectRoot);
          const values: Record<string, string> = {};
          const toPersist: Record<string, string> = {};
          for (const inp of required) {
            const v = submitted[inp.name] ?? stored[inp.name];
            if (v !== undefined) values[inp.name] = v;
            if (submitted[inp.name] !== undefined) toPersist[inp.name] = submitted[inp.name];
          }
          if (Object.keys(toPersist).length) {
            writeSecrets(projectRoot, toPersist);
            ensureGitignored(projectRoot);
          }
          secretValues = [
            ...required.filter((i) => i.secret).map((i) => values[i.name]),
            ...Object.values(stored),
          ].filter((v): v is string => typeof v === "string" && v.length > 0);

          // N172 — snapshot prior .mcp.json entries (real values) before a force
          // overwrite so the immediate "Undo overwrite" button can restore them.
          if (parsed.force === true) {
            const mcpPath = resolve(projectRoot, ".mcp.json");
            if (existsSync(mcpPath)) {
              try {
                const current = (
                  JSON.parse(readFileSync(mcpPath, "utf-8")) as {
                    mcpServers?: Record<string, unknown>;
                  }
                ).mcpServers;
                for (const m of artifacts.mcpServers) {
                  if (current && current[m.name] !== undefined) {
                    overwriteSnapshots.set(m.name, current[m.name]);
                  }
                }
              } catch {
                /* unreadable .mcp.json — nothing to snapshot */
              }
            }
          }

          const plan = planFromArtifacts(artifacts);
          transport.emit("install-progress", { phase: "started", kind, id, plan });
          const reports = applyArtifacts(
            artifacts,
            projectRoot,
            targetBucketId(target),
            { INSIGHT_FLOW_BIN: "insight-flow", ...values },
            { force: parsed.force === true },
          );
          for (const r of reports) {
            transport.emit("install-progress", {
              phase: "step",
              target: r.target,
              action: r.action,
            });
          }
          transport.emit("install-progress", { phase: "done", kind, id, reports });
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, kind, id, reports }));
        } catch (err) {
          if (err instanceof InstallConflictError) {
            transport.emit("install-progress", { phase: "failed", error: err.message });
            res.writeHead(409, { "Content-Type": MIME[".json"] });
            res.end(
              JSON.stringify({ ok: false, conflict: scrubSecrets(err.conflict, secretValues) }),
            );
            return;
          }
          const status =
            err instanceof NotInstallableError
              ? 400
              : err instanceof UnknownTargetError
                ? 404
                : 500;
          const message = scrubSecrets((err as Error).message, secretValues);
          transport.emit("install-progress", { phase: "failed", error: message });
          res.writeHead(status, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: message }));
        }
      });
      return;
    }

    // N174 — uninstall plan for any target: which owned artifacts get removed vs
    // retained (still owned by another target). Read-only.
    if (url.pathname === "/api/uninstall-plan" && (req.method ?? "GET") === "GET") {
      const kind = (url.searchParams.get("kind") ?? "") as TargetKind;
      const id = url.searchParams.get("id") ?? "";
      if (!["flow", "agent", "module"].includes(kind) || !id) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "kind (flow|agent|module) and id are required" }));
        return;
      }
      const plan = uninstallPlan(resolveProjectRoot(), targetBucketId({ kind, id }));
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ kind, id, plan }));
      return;
    }

    // N174 — run the uninstall for any target (reference-safe removal) over SSE.
    if (url.pathname === "/api/uninstall" && req.method === "POST") {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString("utf-8")));
      req.on("end", () => {
        try {
          const parsed = body ? (JSON.parse(body) as { kind?: TargetKind; id?: string }) : {};
          const kind = parsed.kind as TargetKind;
          const id = parsed.id ?? "";
          if (!["flow", "agent", "module"].includes(kind) || !id) {
            res.writeHead(400, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: "kind and id are required" }));
            return;
          }
          const target: InstallTarget = { kind, id };
          transport.emit("uninstall-progress", {
            phase: "started",
            kind,
            id,
            plan: uninstallPlan(resolveProjectRoot(), targetBucketId(target)),
          });
          const reports = uninstallTarget(resolveProjectRoot(), targetBucketId(target));
          for (const r of reports) {
            transport.emit("uninstall-progress", {
              phase: "step",
              target: r.target,
              action: r.action,
            });
          }
          transport.emit("uninstall-progress", { phase: "done", kind, id, reports });
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, kind, id, reports }));
        } catch (err) {
          const message = (err as Error).message;
          transport.emit("uninstall-progress", { phase: "failed", error: message });
          res.writeHead(500, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: message }));
        }
      });
      return;
    }

    if (url.pathname === "/api/projects" && (req.method ?? "GET") === "GET") {
      const projects = Object.values(mergedProjectsView()).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        source: isBuiltinProjectId(p.id) ? "builtin" : "custom",
        agentCount: p.agents.length,
        flowCount: p.flow.length,
        // N122 — empty ⇒ not selectable by agent (only by type / explicit).
        entryAgents: p.entryAgents,
        // N128/N129 — the flow's status set drives the kanban columns.
        statuses: p.statuses,
      }));
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ projects }));
      return;
    }

    // N103 — CRUD for custom definitions (POST/PUT/DELETE on
    // /api/{modules,agents,projects}). Reads fall through to the handlers
    // below; successful writes notify connected dashboards.
    if (
      handleCustomDefsRequest(req, res, url, () =>
        // Dedicated SSE event so the client can drop its registry cache; a
        // write in one tab is then reflected on the next registry navigation
        // in any connected tab (full live re-render is a later iteration).
        transport.emit("custom-defs-changed", { at: new Date().toISOString() }),
      )
    ) {
      return;
    }

    // N93 — composer registry browser; N102 — merged with the project's
    // user-space registries (insightFlow/{modules,agents}), reloaded per
    // request so CRUD writes appear live. An invalid user space degrades to
    // built-ins with the error surfaced, never a dead endpoint.
    if (url.pathname === "/api/modules") {
      const { modules: moduleRegistry, agents: composedAgents, userSpaceError } = mergedView();
      const referencedBy: Record<string, string[]> = {};
      for (const def of Object.values(composedAgents)) {
        for (const id of def.modules) (referencedBy[id] ??= []).push(def.id);
        // N190 (review-fix) — an orchestrator references a subagent module via
        // its `subagents` array, so count those too (else the dashboard shows
        // "referenced by 0 agents" for a subagent that task-review delegates to).
        for (const id of def.subagents ?? []) {
          if (!(referencedBy[id] ??= []).includes(def.id)) referencedBy[id].push(def.id);
        }
      }
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(
        JSON.stringify({
          modules: Object.values(moduleRegistry),
          referencedBy,
          ...(userSpaceError ? { userSpaceError } : {}),
        }),
      );
      return;
    }

    if (url.pathname === "/api/agents") {
      const { modules: moduleRegistry, agents: composedAgents, userSpaceError } = mergedView();
      const agents = Object.values(composedAgents).map((def) => ({
        id: def.id,
        title: def.title,
        description: def.description,
        source: def.id.startsWith("custom:") ? "custom" : "builtin",
        // N138 — surface the installable-command opt-in so the edit form repopulates.
        ...(def.command ? { command: def.command } : {}),
        modules: def.modules.map((id) => {
          const mod = moduleRegistry[id];
          return {
            id,
            title: mod?.title ?? id,
            kind: mod?.kind ?? "unknown",
            description: mod?.description,
          };
        }),
        // N191 (review-fix) — surface an orchestrator's declared subagents so the
        // agent detail view can show what it fans out to.
        ...(def.subagents && def.subagents.length
          ? {
              subagents: def.subagents.map((id) => {
                const mod = moduleRegistry[id];
                return {
                  id,
                  title: mod?.title ?? id,
                  kind: mod?.kind ?? "unknown",
                  description: mod?.description,
                };
              }),
            }
          : {}),
      }));
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ agents, ...(userSpaceError ? { userSpaceError } : {}) }));
      return;
    }

    // N93 R2 — serve the markdown content behind an include module's @ref so
    // the UI can render a formatted preview. Strictly whitelisted: only refs
    // registered as include modules are readable (never arbitrary paths).
    if (url.pathname === "/api/include-doc") {
      const ref = url.searchParams.get("ref") || "";
      const allowed = new Set(
        Object.values(MODULE_REGISTRY)
          .filter((m) => m.kind === "include")
          .map((m) => (m.kind === "include" ? m.ref : "")),
      );
      if (!allowed.has(ref)) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Unknown include ref" }));
        return;
      }
      // The include target lives at the project root (canonical repo) or in
      // rolesDir (consumer projects scaffolded by init).
      const candidates = [
        resolve(process.cwd(), ref),
        config.rolesDir ? resolve(process.cwd(), config.rolesDir, ref) : null,
      ].filter((p): p is string => p !== null);
      for (const path of candidates) {
        if (!existsSync(path)) continue;
        res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
        res.end(readFileSync(path, "utf-8"));
        return;
      }
      res.writeHead(404, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ error: "Include file not found in this project" }));
      return;
    }

    // N117 — reassign a task's flow from the dashboard (ready-only). Same
    // guards as the CLI `set-flow` via the shared setTaskFlow core.
    if (url.pathname === "/api/task-flow" && req.method === "POST") {
      let body = "";
      let aborted = false;
      req.on("data", (chunk: Buffer) => {
        if (aborted) return;
        body += chunk.toString("utf-8");
        if (body.length > 16 * 1024) {
          aborted = true;
          res.writeHead(413, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "payload too large" }));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (aborted) return;
        let parsed: { id?: string; flow?: string };
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "invalid JSON" }));
          return;
        }
        if (!parsed.id || !parsed.flow) {
          res.writeHead(400, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "id and flow are required" }));
          return;
        }
        // N151 — async body callback: guard the master read/setTaskFlow so a
        // malformed master.json returns 500 instead of crashing the process
        // (the handler-wide boundary can't catch a throw in this later tick).
        try {
          const master = jsonFileStorage.loadMaster(config);
          const result = setTaskFlow(config, master, parsed.id, parsed.flow);
          const status = result.ok
            ? 200
            : result.error === "not-found"
              ? 404
              : result.error === "locked"
                ? 409
                : 400;
          if (result.ok) transport.emit("file-change", { at: new Date().toISOString() });
          res.writeHead(status, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify(result.ok ? { ok: true, flowId: result.flowId } : result));
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
          }
        }
      });
      return;
    }

    if (url.pathname === "/api/agent-done" && req.method === "POST") {
      if (config.notifications?.browser !== false) {
        transport.emit("agent-done", { ts: Date.now() });
      }
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // N79: direct browser permission toast (mirrors agent-done; Cursor approval gate).
    if (url.pathname === "/api/agent-permission" && req.method === "POST") {
      if (config.notifications?.browser !== false) {
        transport.emit("agent-permission", { ts: Date.now() });
      }
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // N68: hook event ingestion. Hooks POST one event per fire; server orders
    // by `timestamp`, derives status, broadcasts an `event` frame on fresh
    // events and a `status` frame only on transitions, then forwards to
    // master.
    if (url.pathname === "/log/events" && req.method === "POST") {
      let body = "";
      let aborted = false;
      req.on("data", (chunk: Buffer) => {
        if (aborted) return;
        body += chunk.toString("utf-8");
        if (body.length > 64 * 1024) {
          aborted = true;
          res.writeHead(413, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "payload too large" }));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (aborted) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: false, error: "invalid JSON" }));
          return;
        }
        const validated = HookEventInputSchema.safeParse(parsed);
        if (!validated.success) {
          res.writeHead(400, { "Content-Type": MIME[".json"] });
          res.end(
            JSON.stringify({
              ok: false,
              error: "validation failed",
              issues: validated.error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
              })),
            }),
          );
          return;
        }
        // N151 — guard the post-parse work (eventStore.insert writes to disk;
        // the master push does I/O). A throw here runs in a later tick the
        // handler-wide boundary can't catch, so return 500 instead of crashing
        // this high-traffic endpoint.
        try {
          const event = validated.data;
          const { duplicate, from, to } = eventStore.insert(event);

          // Skip socket emit on duplicates so retried hooks don't double-render
          // in the dashboard. Status frame still gated on a real transition.
          if (!duplicate) {
            // N157 — opt-in Langfuse sink (no-op when disabled; fire-and-forget,
            // fail-open). Only events carrying a taskId are exported.
            recordHookEvent(config, event);
            transport.emit("event", { kind: "event", event });
            if (from !== to) {
              const statusAt = new Date().toISOString();
              transport.emit("status", {
                kind: "status",
                from,
                to,
                at: statusAt,
                latestEventId: event.id,
              });
              if (masterId && masterToken) pushStatusToMaster(masterUrl, masterId, masterToken, to);
            }
          }

          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, status: to, duplicate }));
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
          }
        }
      });
      req.on("error", () => {
        if (aborted) return;
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ ok: false, error: "read failed" }));
      });
      return;
    }

    // N68: read-only inspection — current derived status + recent event window.
    if (url.pathname === "/log/status") {
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(
        JSON.stringify({
          status: eventStore.getStatus(),
          events: eventStore.getEvents(),
        }),
      );
      return;
    }

    if (url.pathname === "/api/events") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId || !/^N\d{2,}$/.test(taskId)) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "valid taskId is required (e.g. ?taskId=N26)" }));
        return;
      }
      try {
        const entries = readdirSync(workDir, { withFileTypes: true });
        const dir = entries.find((e) => e.isDirectory() && e.name.startsWith(taskId + "-"));
        if (!dir) {
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ events: [] }));
          return;
        }
        const eventsPath = resolve(workDir, dir.name, "events.json");
        if (!existsSync(eventsPath)) {
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ events: [] }));
          return;
        }
        const raw = JSON.parse(readFileSync(eventsPath, "utf-8")) as { events?: unknown[] };
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ events: Array.isArray(raw.events) ? raw.events : [] }));
      } catch {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Failed to read events" }));
      }
      return;
    }

    if (url.pathname === "/api/session-events") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
      try {
        const files = existsSync(MASTER_LOCK_DIR)
          ? readdirSync(MASTER_LOCK_DIR)
              .filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"))
              .map((f) => {
                const p = resolve(MASTER_LOCK_DIR, f);
                return { name: f, path: p, mtime: statSync(p).mtimeMs };
              })
              .sort((a, b) => b.mtime - a.mtime)
          : [];

        if (files.length === 0) {
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ events: [], sessionId: null }));
          return;
        }

        const mostRecent = files[0];
        const sessionId = mostRecent.name.replace("events-", "").replace(".jsonl", "");
        const lines = readFileSync(mostRecent.path, "utf-8")
          .split("\n")
          .filter((l) => l.trim());
        const events = lines
          .map((l) => {
            try {
              return JSON.parse(l) as unknown;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .slice(-limit);

        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ events, sessionId }));
      } catch {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: "Failed to read session events" }));
      }
      return;
    }

    if (url.pathname.startsWith("/sounds/")) {
      const soundFile = url.pathname.replace("/sounds/", "");
      if (!soundFile || soundFile.includes("..") || !soundFile.endsWith(".mp3")) {
        res.writeHead(404);
        res.end();
        return;
      }
      const soundPath = resolve(dirname(fileURLToPath(import.meta.url)), "sounds", soundFile);
      try {
        const data = readFileSync(soundPath);
        res.writeHead(200, { "Content-Type": MIME[".mp3"], "Content-Length": String(data.length) });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    // N85 cutover: / (and any unmatched route) serves the React SPA shell from
    // dist/dashboard. The client owns view state; all API/SSE/asset/config routes
    // above return before reaching this fallthrough.
    try {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(readFileSync(resolve(DASHBOARD_DIR, "index.html"), "utf-8"));
    } catch {
      res.writeHead(500, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ error: "Dashboard build not found. Run `pnpm build`." }));
    }
  }

  // N151 — handler-wide error boundary: an unhandled throw anywhere in dispatch
  // (e.g. a malformed/missing master.json read) returns 500 instead of crashing
  // the long-running dashboard process. Async body callbacks guard themselves
  // (they run after dispatch returns) — see /api/task-flow.
  const server = createServer((req, res) => {
    try {
      dispatch(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
      }
    }
  });

  // N83: native Server-Sent Events (replaced socket.io). The browser subscribes
  // with EventSource('/sse'); requests are routed in via transport.handleRequest
  // at the top of the HTTP handler. EventSource handles reconnection natively.
  const transport: Transport = new SseTransport();

  transport.onConnection((client) => {
    client.emit("snapshot", {
      activity: activity.getRecentEvents(),
      // N227 — the derived agent status so the badge is correct on first paint.
      // Previously the client defaulted to "idle" until the next live event,
      // even though the seeded activity feed already implied "active".
      agentStatus: claudeStatusFromProjectStatus(eventStore.getStatus()),
      hookStatus,
      configEnabled,
      // N85: read-only config flags the React SPA needs (the legacy dashboard
      // had these injected server-side into getDashboardHtml). Sent on every
      // (re)connect alongside the existing snapshot fields.
      projectName: config.projectName || "",
      browserNotifications: config.notifications?.browser !== false,
      soundsEnabled: config.notifications?.sounds?.enabled !== false,
      verbosity: config.activityEngine?.verbosity ?? "both",
    });
  });

  // N68 round-3 fix: activity-engine events ALSO feed the EventStore so the
  // master overview gets status updates even when hooks call an unmigrated
  // (pre-N68) `insight-flow` binary that doesn't POST to `/log/events`. Both
  // paths funnel through the same `statusFromEvent` derivation, so the
  // four-state vocabulary stays unified — the activity path is just a
  // fallback writer keyed off the dash-case derived names (`agent-idle`,
  // `approval-required`, …) which `statusFromEvent` already knows.
  let activityDebounceTimer: NodeJS.Timeout | null = null;
  activity.onEvent((event) => {
    transport.emit("activity", event);

    // Only forward Event-tool activity rows (hook-sourced) — Tool/Skill/Phase
    // activity rows don't carry hook-level state and would just add noise.
    // `activitySeq` continues from the startup seed loop above.
    const synthetic = activityRowToHookEvent(event, activitySeq);
    if (synthetic) {
      activitySeq++;
      const { duplicate, from, to } = eventStore.insert(synthetic);
      if (!duplicate && from !== to) {
        transport.emit("status", {
          kind: "status",
          from,
          to,
          at: new Date().toISOString(),
          latestEventId: synthetic.id,
        });
        if (masterId && masterToken) pushStatusToMaster(masterUrl, masterId, masterToken, to);
      }
    }

    // Debounce master state push so rapid tool events don't flood it.
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
      transport.emit("file-change", null);
      if (pushToMaster) void pushToMaster();
    }, WATCH_DEBOUNCE_MS);
  }

  const watcher = watchWorkDir(workDir, scheduleFileChangeBroadcast);

  // N225 — advertise the ACTUAL port so `log-event` (a separate process that
  // only knows config.server.port) posts /log/events here even when the hub
  // started us on an assigned port. Keyed by project root; cleared on shutdown.
  const portPointerRoot = resolveProjectRoot();

  server.listen(serverPort, () => {
    writeServerPortPointer(portPointerRoot, serverPort);
    const engineStatus = configEnabled ? "Activity engine ON" : "Activity engine OFF";
    console.log("\n  Taskflow Dashboard\n");
    console.log("  Local:   http://localhost:" + serverPort);
    console.log("  Data:    " + workDir);
    console.log("  Live:    SSE at /sse");
    console.log("  Engine:  " + engineStatus);
    if (configEnabled) {
      console.log("  Hook:    " + hookStatus);
    }
    if (!config.master?.standalone) {
      console.log("  Overview: http://localhost:" + serverPort + "/overview");
    }
    const installedHooksVersion = typeof config.hooksVersion === "number" ? config.hooksVersion : 0;
    if (installedHooksVersion < BUNDLED_HOOKS_VERSION) {
      console.log(
        "  Hooks:   installed v" +
          installedHooksVersion +
          " < bundled v" +
          BUNDLED_HOOKS_VERSION +
          " — run `insight-flow migrate-hooks` to upgrade",
      );
    }
    console.log("");

    // Open the user's default browser, unless suppressed (INSIGHT_FLOW_NO_OPEN=1)
    // — e.g. tests, CI, or headless environments. Default behavior is unchanged.
    if (process.env.INSIGHT_FLOW_NO_OPEN !== "1") {
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(openCmd + " http://localhost:" + serverPort);
    }
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    activity.stop();
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    transport.close();
    clearServerPortPointer(portPointerRoot); // N225
    // N225 — keep the activity log on shutdown (the engine trims it to the tail
    // on next start), so the feed survives a hub-driven restart on a new port.
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown); // N225 — the hub stops projects via SIGTERM
}
