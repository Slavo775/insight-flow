import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, watch, unlinkSync } from "node:fs";
import { normalize, resolve, sep } from "node:path";
import { exec } from "node:child_process";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir } from "../config.js";
import { handleUpgrade, type WsClient } from "./ws.js";
import { ActivityEngine, NoopActivityEngine } from "./activity.js";
import { getDashboardHtml } from "./dashboard.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

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
    // Containment guard: refuse to read outside workDir even if a maliciously
    // crafted task.folder smuggled `..` segments past schema validation.
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

export function startServer(config: TaskflowConfig, port?: number): void {
  const serverPort = port || config.server.port;
  const workDir = getWorkDir(config);
  const activityConfig = config.activityEngine ?? {
    enabled: false,
    logFile: ".taskflow-activity.jsonl",
    maxEvents: 200,
  };
  const activityLogPath = resolve(process.cwd(), activityConfig.logFile);
  const wsClients: Set<WsClient> = new Set();

  if (!existsSync(workDir)) {
    console.error("Work directory not found: " + workDir);
    console.error("Run 'taskflow init' first.");
    process.exit(1);
  }

  // Activity engine
  const activity = activityConfig.enabled
    ? new ActivityEngine(activityLogPath, activityConfig)
    : new NoopActivityEngine();

  activity.start();

  activity.onEvent((event) => {
    broadcast({ type: "activity", data: event });
  });

  const watcher = watch(workDir, { recursive: false }, () => {
    broadcast({ type: "file-change", data: null });
  });

  function broadcast(msg: { type: string; data: unknown }): void {
    const payload = JSON.stringify(msg);
    for (const client of wsClients) {
      client.send(payload);
    }
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // List work task files
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

    // Serve specific JSON file
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
        // For shard files, hydrate tasks with their side-file reviews/incidents
        // so the dashboard sees the pre-split shape regardless of on-disk schema.
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

    // Activity events API (REST fallback)
    if (url.pathname === "/api/activity") {
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify(activity.getRecentEvents()));
      return;
    }

    // Serve the legacy dashboard HTML for "/" and unknown routes.
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(getDashboardHtml(config));
  });

  // Handle WebSocket upgrades
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const client = handleUpgrade(req, socket, head);
    if (!client) return;

    wsClients.add(client);

    const snapshot = {
      type: "snapshot",
      data: {
        activity: activity.getRecentEvents(),
      },
    };
    client.send(JSON.stringify(snapshot));

    client.onClose(() => {
      wsClients.delete(client);
    });
  });

  server.listen(serverPort, () => {
    const engineStatus = activityConfig.enabled ? "Activity engine ON" : "Activity engine OFF";
    console.log("\n  Taskflow Dashboard\n");
    console.log("  Local:   http://localhost:" + serverPort);
    console.log("  Data:    " + workDir);
    console.log("  Live:    WebSocket on /ws");
    console.log("  Engine:  " + engineStatus + "\n");

    const openCmd =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(openCmd + " http://localhost:" + serverPort);
  });

  process.on("SIGINT", () => {
    activity.stop();
    watcher.close();
    try {
      if (existsSync(activityLogPath)) unlinkSync(activityLogPath);
    } catch {
      // ignore
    }
    server.close();
    process.exit(0);
  });
}
