import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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
import type { TaskflowConfig, HookEventInput } from "../../core/types.js";
import { getWorkDir, setDefaultFlow } from "../../core/config.js";
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
import { DEFAULT_PROJECT, projectBucketId } from "../../agents/project.js";
import { flowInstallPlan, flowArtifacts, flowRequiredInputs } from "../../agents/flow-install.js";
import { applyArtifacts, InstallConflictError } from "../../agents/emit.js";
import { resolveProjectRoot } from "../../core/paths.js";
import { readSecrets, writeSecrets, ensureGitignored, scrubSecrets } from "../../core/secrets.js";
import { loadUserRegistries } from "../../agents/user-registry.js";
import { definitionRevision, handleCustomDefsRequest } from "./custom-defs.js";
import type { Project } from "../../agents/project.js";

/** N108 — shipped default + user-space flows; degrades to default-only. */
function mergedProjectsView(): Record<string, Project> {
  try {
    return { [DEFAULT_PROJECT.id]: DEFAULT_PROJECT, ...loadUserRegistries().projects };
  } catch {
    return { [DEFAULT_PROJECT.id]: DEFAULT_PROJECT };
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

function pushStatusToMaster(masterUrl: string, id: string, status: string): void {
  void fetch(`${masterUrl}/api/projects/${id}/status`, {
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
): Promise<string | null> {
  try {
    const res = await fetch(`${masterUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, label, url: projectUrl }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
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
  } catch {
    return 0;
  }
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

  // Register with master
  const projectUrl = `http://localhost:${serverPort}`;
  masterId = await registerWithMaster(
    masterUrl,
    config.projectName,
    config.projectName,
    projectUrl,
  );
  if (!masterId) {
    console.log(
      "  [master] Could not register with master at " + masterUrl + " — overview disabled",
    );
    return null;
  }

  console.log("  [master] Registered with " + masterUrl + " (id: " + masterId.slice(0, 8) + "...)");

  // Push initial state
  const state = buildProjectState(config, activity);
  void pushStateToMaster(masterUrl, masterId, state);
  pushStatusToMaster(masterUrl, masterId, "idle");

  // Return push function to call on file-change
  return async function pushOnChange(): Promise<void> {
    if (!masterId) return;
    const s = buildProjectState(config, activity);
    const status = await pushStateToMaster(masterUrl, masterId, s);
    if (status === 401) {
      masterId = await registerWithMaster(
        masterUrl,
        config.projectName,
        config.projectName,
        projectUrl,
      );
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

  const configEnabled = activityConfig.enabled === true;
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

  // N68: in-memory hook-event store driving derived project status.
  const eventStore = new EventStore();

  // N151 — the request dispatch lives in a named function so the createServer
  // callback can wrap it in a handler-wide error boundary (below).
  function dispatch(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    // N83: native SSE stream (replaced socket.io). Hand matching requests off
    // to the transport, which takes over the response and keeps it open.
    if (transport.handleRequest(req, res)) return;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");

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
          source: project.id === DEFAULT_PROJECT.id ? "builtin" : "custom",
          // N121 — true when a user-space override file shadows the shipped def
          // (drives the "Revert to shipped" affordance for the default flow).
          ejected: definitionRevision("projects", project.id) !== null,
          // N111 — optimistic-concurrency token; PUTs echo it via x-revision.
          revision:
            project.id === DEFAULT_PROJECT.id
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

    // N125 — the install plan for a flow (mcp/hook/skill artifacts from its
    // agents + install list). Read-only; execution is N126.
    if (url.pathname === "/api/flow-install-plan" && (req.method ?? "GET") === "GET") {
      const flowId = url.searchParams.get("id") ?? DEFAULT_PROJECT.id;
      const flow = mergedProjectsView()[flowId];
      if (!flow) {
        res.writeHead(404, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ error: `unknown flow '${flowId}'` }));
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      // N165 — requiredInputs lets the modal render fields for `${VAR}` placeholders.
      // N165 change: flag inputs whose value is already saved (the boolean only —
      // the secret value never leaves the server) so the modal can show "saved"
      // and let the user leave it blank to reuse.
      const stored = readSecrets(resolveProjectRoot());
      const requiredInputs = flowRequiredInputs(flow).map((inp) => ({
        ...inp,
        saved: Boolean(stored[inp.name] && stored[inp.name].length > 0),
      }));
      res.end(JSON.stringify({ flowId, plan: flowInstallPlan(flow), requiredInputs }));
      return;
    }

    // N126 — run the install plan for a flow (write .mcp.json / hooks / skills
    // via the idempotent emitter) and stream per-step progress over SSE.
    if (url.pathname === "/api/flow-install" && req.method === "POST") {
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
        // N165 — collect/persist input values + secrets out of scope; declared
        // here so the catch can scrub secret values from any error surface.
        let secretValues: string[] = [];
        try {
          const parsed = body
            ? (JSON.parse(body) as {
                id?: string;
                values?: Record<string, string>;
                force?: boolean;
              })
            : {};
          const flowId = parsed.id ?? DEFAULT_PROJECT.id;
          const flow = mergedProjectsView()[flowId];
          if (!flow) {
            res.writeHead(404, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: false, error: `unknown flow '${flowId}'` }));
            return;
          }
          const projectRoot = resolveProjectRoot();

          // N165 — resolve `${VAR}` inputs: submitted values win over the stored
          // secrets; newly-submitted values are persisted (gitignored) so a
          // re-install doesn't re-prompt. .mcp.json now holds substituted secrets.
          const required = flowRequiredInputs(flow);
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
          // N165 review-fix — scrub against this submission's secrets AND every
          // value already in the local store, so a *previously-stored* key that
          // sits on the `.mcp.json` "installed" side of a conflict diff is masked
          // too (not just the value just submitted).
          secretValues = [
            ...required.filter((i) => i.secret).map((i) => values[i.name]),
            ...Object.values(stored),
          ].filter((v): v is string => typeof v === "string" && v.length > 0);

          const plan = flowInstallPlan(flow);
          transport.emit("install-progress", { phase: "started", flowId, plan });
          const reports = applyArtifacts(
            flowArtifacts(flow),
            projectRoot,
            projectBucketId(flow),
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
          transport.emit("install-progress", { phase: "done", flowId, reports });
          res.writeHead(200, { "Content-Type": MIME[".json"] });
          res.end(JSON.stringify({ ok: true, flowId, reports }));
        } catch (err) {
          // N165 — a differing config is a structured conflict (409): the modal
          // shows a before/after diff and can retry with `force`. Secret values
          // are scrubbed from every surface.
          if (err instanceof InstallConflictError) {
            transport.emit("install-progress", { phase: "failed", error: err.message });
            res.writeHead(409, { "Content-Type": MIME[".json"] });
            res.end(
              JSON.stringify({ ok: false, conflict: scrubSecrets(err.conflict, secretValues) }),
            );
            return;
          }
          const message = scrubSecrets((err as Error).message, secretValues);
          transport.emit("install-progress", { phase: "failed", error: message });
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
        source: p.id === DEFAULT_PROJECT.id ? "builtin" : "custom",
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
              if (masterId) pushStatusToMaster(masterUrl, masterId, to);
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
  let activitySeq = 0;
  activity.onEvent((event) => {
    transport.emit("activity", event);

    // Only forward Event-tool activity rows (hook-sourced) — Tool/Skill/Phase
    // activity rows don't carry hook-level state and would just add noise.
    if (event.tool === "Event" && typeof event.action === "string") {
      const synthetic: HookEventInput = {
        id: `act_${event.ts}_${activitySeq++}`,
        timestamp: event.ts,
        // Pass the dash-case derived action directly; `statusFromEvent`
        // accepts both vocabularies.
        type: event.action,
        payload: {},
      };
      const { duplicate, from, to } = eventStore.insert(synthetic);
      if (!duplicate && from !== to) {
        transport.emit("status", {
          kind: "status",
          from,
          to,
          at: new Date().toISOString(),
          latestEventId: synthetic.id,
        });
        if (masterId) pushStatusToMaster(masterUrl, masterId, to);
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

  server.listen(serverPort, () => {
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

  process.on("SIGINT", () => {
    activity.stop();
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    transport.close();
    try {
      if (existsSync(activityLogPath)) unlinkSync(activityLogPath);
    } catch {
      // ignore
    }
    server.close();
    process.exit(0);
  });
}
