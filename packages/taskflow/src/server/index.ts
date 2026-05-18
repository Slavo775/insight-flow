import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, watch, unlinkSync, statSync } from "node:fs";
import { resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir } from "../config.js";
import { handleUpgrade, type WsClient } from "./ws.js";
import { ActivityEngine, NoopActivityEngine } from "./activity.js";
import { getDashboardHtml } from "./dashboard.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function mimeFor(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return MIME[filePath.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

function injectRuntimeConfig(html: string, config: TaskflowConfig): string {
  const runtime = {
    projectName: config.projectName,
    apiBase: "",
    activityEngine: { enabled: config.activityEngine?.enabled !== false },
  };
  const tag =
    "<script>window.__TASKFLOW_CONFIG__=" +
    JSON.stringify(runtime).replace(/</g, "\\u003c") +
    ";</script>";
  if (html.includes("<!-- TASKFLOW_CONFIG -->")) {
    return html.replace("<!-- TASKFLOW_CONFIG -->", tag);
  }
  // Fallback: inject before </head>, then before </body>, then at the top.
  if (html.includes("</head>")) return html.replace("</head>", tag + "</head>");
  if (html.includes("</body>")) return html.replace("</body>", tag + "</body>");
  return tag + html;
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

  // Locate the bundled UI directory (dist/ui), next to dist/cli.js at runtime.
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const uiDir = resolve(moduleDir, "ui");
  const uiIndexPath = resolve(uiDir, "index.html");
  const hasBundledUi = existsSync(uiIndexPath);

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

  function serveUiFile(pathname: string, res: import("node:http").ServerResponse): boolean {
    if (!hasBundledUi) return false;

    // Resolve the requested file inside the UI dir. Strip leading slash.
    const requested = pathname.replace(/^\/+/, "") || "index.html";
    const resolved = resolve(uiDir, requested);
    const normalized = normalize(resolved);

    // Path-traversal guard: must stay inside uiDir.
    if (!normalized.startsWith(uiDir + sep) && normalized !== uiDir) {
      return false;
    }

    if (existsSync(normalized)) {
      try {
        const stat = statSync(normalized);
        if (stat.isFile()) {
          if (normalized === uiIndexPath) {
            const html = readFileSync(normalized, "utf-8");
            res.writeHead(200, { "Content-Type": MIME[".html"] });
            res.end(injectRuntimeConfig(html, config));
          } else {
            res.writeHead(200, { "Content-Type": mimeFor(normalized) });
            res.end(readFileSync(normalized));
          }
          return true;
        }
      } catch {
        // fall through to SPA fallback
      }
    }
    return false;
  }

  function serveSpaFallback(res: import("node:http").ServerResponse): void {
    if (hasBundledUi) {
      const html = readFileSync(uiIndexPath, "utf-8");
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(injectRuntimeConfig(html, config));
      return;
    }
    // Legacy: inline HTML dashboard if no bundled UI is shipped.
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(getDashboardHtml(config));
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
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(content);
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

    // Static UI assets — try to serve from the bundled dist/ui directory.
    if (serveUiFile(url.pathname, res)) return;

    // SPA fallback (also covers "/" and unknown routes).
    serveSpaFallback(res);
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
    const uiStatus = hasBundledUi
      ? "Bundled React UI"
      : "Legacy inline dashboard (run build first)";
    console.log("\n  Taskflow Dashboard\n");
    console.log("  Local:   http://localhost:" + serverPort);
    console.log("  Data:    " + workDir);
    console.log("  UI:      " + uiStatus);
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
