import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import { homedir } from "node:os";
import type { MasterServerConfig, MasterProjectState } from "./types.js";
import * as registry from "./registry.js";
import { getOverviewHtml } from "./overview.js";
import { initProject } from "../agents/init/index.js";

/** N210 — where "New project" scaffolds live, so a non-coder never picks a path. */
export function projectsHomeRoot(): string {
  return process.env.INSIGHT_FLOW_PROJECTS_HOME || resolve(homedir(), "insight-flow-projects");
}

const MIME_JSON = "application/json; charset=utf-8";
const MIME_HTML = "text/html; charset=utf-8";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", () => resolve(""));
  });
}

export async function startMasterServer(
  config: Required<MasterServerConfig>,
): Promise<{ close(): void }> {
  const server = createServer();

  // N83: native Server-Sent Events (replaced socket.io). Overview clients
  // subscribe with EventSource('/events'); project-update frames broadcast here.
  const sseClients = new Set<ServerResponse>();
  function broadcast(event: string, payload: unknown): void {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(frame);
      } catch {
        /* stream gone */
      }
    }
  }

  server.on("request", async (req, res) => {
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

      // GET /events — SSE stream for overview clients (N83, replaced socket.io).
      if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no",
        });
        res.write("retry: 1000\n\n");
        sseClients.add(res);
        const heartbeat = setInterval(() => {
          try {
            res.write(": ping\n\n");
          } catch {
            /* stream gone */
          }
        }, 25000);
        req.on("close", () => {
          clearInterval(heartbeat);
          sseClients.delete(res);
        });
        return;
      }

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
        if (entry) broadcast("project-update", entry);
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
        if (entry) broadcast("project-update", entry);
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
          const validStatuses = [
            "active",
            "idle",
            "permission-required",
            "done",
            "awaiting-permission",
          ];
          if (!validStatuses.includes(status)) {
            res.writeHead(400, { "Content-Type": MIME_JSON });
            res.end(
              JSON.stringify({
                error:
                  "Invalid status; expected active|idle|done|permission-required|awaiting-permission",
              }),
            );
          } else {
            res.writeHead(401, { "Content-Type": MIME_JSON });
            res.end(JSON.stringify({ error: "Unknown project id" }));
          }
          return;
        }
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", entry);
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

      // POST /api/projects/create — N210: scaffold a new project from the home
      // UI (non-coder onboarding). Creates <projects-home>/<slug>, runs init,
      // and registers it. Path is confined to the projects-home root (no
      // traversal). This endpoint writes to the filesystem, so — because the
      // server binds all interfaces — it is gated to **loopback callers only**
      // (the browser on this machine); a LAN peer gets 403.
      if (req.method === "POST" && url.pathname === "/api/projects/create") {
        const remote = req.socket.remoteAddress ?? "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "create-project is localhost-only" }));
          return;
        }
        const body = await readBody(req);
        let parsed: { name?: unknown };
        try {
          parsed = JSON.parse(body) as { name?: unknown };
        } catch {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
        const name = String(parsed.name ?? "").trim();
        if (!name || !/^[A-Za-z0-9 _-]{1,60}$/.test(name)) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Invalid name (use letters, numbers, spaces, _ or -)" }));
          return;
        }
        const root = projectsHomeRoot();
        const slug = name.trim().replace(/\s+/g, "-").toLowerCase();
        const dir = resolve(root, slug);
        if (dir !== root && !dir.startsWith(root + sep)) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Resolved path escapes the projects home" }));
          return;
        }
        if (existsSync(resolve(dir, "taskflow.config.json"))) {
          res.writeHead(409, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: `A project already exists at ${dir}` }));
          return;
        }
        try {
          mkdirSync(dir, { recursive: true });
          await initProject(dir, false, { yes: true });
        } catch (err) {
          res.writeHead(500, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: `Could not create project: ${(err as Error).message}` }));
          return;
        }
        const id = registry.upsert(slug, name, "");
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", entry);
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ id, name, path: dir }));
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
    } catch {
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
      for (const client of sseClients) {
        try {
          client.end();
        } catch {
          /* ignore */
        }
      }
      server.close();
    },
  };
}
