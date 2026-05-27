import { createServer, type IncomingMessage } from "node:http";
import { Server as IOServer } from "socket.io";
import type { MasterServerConfig, MasterProjectState } from "./types.js";
import * as registry from "./registry.js";
import { getOverviewHtml } from "./overview.js";

const MIME_JSON = "application/json; charset=utf-8";
const MIME_HTML = "text/html; charset=utf-8";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", () => resolve(""));
  });
}

export async function startMasterServer(
  config: Required<MasterServerConfig>,
): Promise<{ close(): void }> {
  const server = createServer();

  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  server.on("request", async (req, res) => {
    // Socket.IO handles its own requests first (prependListener); skip if already responded.
    if (res.headersSent) return;
    try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);

    // POST /api/register
    if (req.method === "POST" && url.pathname === "/api/register") {
      if (config.standalone) {
        res.writeHead(503, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Master running in standalone mode" }));
        return;
      }
      const body = await readBody(req);
      let parsed: { label?: unknown; url?: unknown; projectId?: unknown };
      try {
        parsed = JSON.parse(body) as { label?: unknown; url?: unknown; projectId?: unknown };
      } catch {
        res.writeHead(400, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
      const label = String(parsed.label ?? "unknown");
      const projectUrl = String(parsed.url ?? "");
      const projectId = String(parsed.projectId ?? parsed.label ?? "unknown");
      const id = registry.upsert(projectId, label, projectUrl);
      const entry = registry.getById(id);
      if (entry) io.emit("project-update", entry);
      res.writeHead(200, { "Content-Type": MIME_JSON });
      res.end(JSON.stringify({ id }));
      return;
    }

    // POST /api/projects/:id/update
    const updateMatch = /^\/api\/projects\/([^/]+)\/update$/.exec(url.pathname);
    if (req.method === "POST" && updateMatch) {
      const id = updateMatch[1];
      const body = await readBody(req);
      let state: MasterProjectState;
      try {
        state = JSON.parse(body) as MasterProjectState;
      } catch {
        res.writeHead(400, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
      const ok = registry.update(id, state);
      if (!ok) {
        res.writeHead(401, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Unknown project id" }));
        return;
      }
      const entry = registry.getById(id);
      if (entry) io.emit("project-update", entry);
      res.writeHead(200, { "Content-Type": MIME_JSON });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // POST /api/projects/:id/status
    const statusMatch = /^\/api\/projects\/([^/]+)\/status$/.exec(url.pathname);
    if (req.method === "POST" && statusMatch) {
      const id = statusMatch[1];
      const body = await readBody(req);
      let parsed: { status?: unknown };
      try {
        parsed = JSON.parse(body) as { status?: unknown };
      } catch {
        res.writeHead(400, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
      const status = String(parsed.status ?? "");
      const ok = registry.updateStatus(id, status);
      if (!ok) {
        const validStatuses = ["active", "idle", "permission-required"];
        if (!validStatuses.includes(status)) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Invalid status; expected active|idle|permission-required" }));
        } else {
          res.writeHead(401, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Unknown project id" }));
        }
        return;
      }
      const entry = registry.getById(id);
      if (entry) io.emit("project-update", entry);
      res.writeHead(200, { "Content-Type": MIME_JSON });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // GET /api/activity/:projectId — last 3 activity events for a project
    const activityMatch = /^\/api\/activity\/([^/]+)$/.exec(url.pathname);
    if (req.method === "GET" && activityMatch) {
      const id = activityMatch[1];
      const entry = registry.getById(id);
      if (!entry) {
        res.writeHead(404, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Unknown project id" }));
        return;
      }
      const events = (entry.state.recentActivity ?? []).slice(-3);
      res.writeHead(200, { "Content-Type": MIME_JSON });
      res.end(JSON.stringify({ project: entry.label, events }));
      return;
    }

    // GET /overview
    if (req.method === "GET" && url.pathname === "/overview") {
      res.writeHead(200, { "Content-Type": MIME_HTML });
      res.end(getOverviewHtml(registry.getAll()));
      return;
    }

    res.writeHead(404, { "Content-Type": MIME_JSON });
    res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(config.port, () => resolve());
  });

  return {
    close() {
      io.close();
      server.close();
    },
  };
}
