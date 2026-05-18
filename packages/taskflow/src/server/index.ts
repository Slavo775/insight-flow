import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, watch, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { exec } from "node:child_process";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir } from "../config.js";
import { handleUpgrade, type WsClient } from "./ws.js";
import { ActivityEngine, NoopActivityEngine } from "./activity.js";
import { getDashboardHtml } from "./dashboard.js";

export function startServer(config: TaskflowConfig, port?: number): void {
  const serverPort = port || config.server.port;
  const workDir = getWorkDir(config);
  const activityConfig = config.activityEngine ?? { enabled: false, logFile: ".taskflow-activity.jsonl", maxEvents: 200 };
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

  // Broadcast activity events to all WS clients
  activity.onEvent((event) => {
    broadcast({ type: "activity", data: event });
  });

  // Watch for file changes in workDir
  const watcher = watch(workDir, { recursive: false }, () => {
    broadcast({ type: "file-change", data: null });
  });

  function broadcast(msg: { type: string; data: unknown }): void {
    const payload = JSON.stringify(msg);
    for (const client of wsClients) {
      client.send(payload);
    }
  }

  const dashboardHtml = getDashboardHtml(config);

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // List work task files
    if (url.pathname === "/api/work-tasks") {
      try {
        const files = readdirSync(workDir).filter((f) => f.endsWith(".json"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(files));
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to list files" }));
      }
      return;
    }

    // Serve specific JSON file
    if (url.pathname.startsWith("/api/work-tasks/")) {
      const fileName = url.pathname.replace("/api/work-tasks/", "");
      if (fileName.includes("..") || fileName.includes("/")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid filename" }));
        return;
      }
      const filePath = resolve(workDir, fileName);
      if (!existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "File not found" }));
        return;
      }
      try {
        const content = readFileSync(filePath, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(content);
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read file" }));
      }
      return;
    }

    // Activity events API (REST fallback)
    if (url.pathname === "/api/activity") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(activity.getRecentEvents()));
      return;
    }

    // Serve dashboard
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(dashboardHtml);
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

    // Send snapshot of recent activity on connect
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

    // Auto-open browser
    const openCmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(openCmd + " http://localhost:" + serverPort);
  });

  process.on("SIGINT", () => {
    activity.stop();
    watcher.close();
    // Clean up ephemeral activity log
    try {
      if (existsSync(activityLogPath)) unlinkSync(activityLogPath);
    } catch { /* ignore */ }
    server.close();
    process.exit(0);
  });
}
