import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
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

/**
 * N212 — a project dashboard always runs locally, so the proxy only ever targets
 * loopback. Refusing anything else keeps the master (which binds all interfaces
 * and whose `/api/register` is open) from being turned into an SSRF / open proxy
 * to arbitrary registrant-supplied URLs.
 */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Hop-by-hop headers must not be forwarded by a proxy (RFC 7230 §6.1). */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function stripHopByHop<T extends Record<string, unknown>>(headers: T): T {
  for (const key of Object.keys(headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) delete headers[key];
  }
  return headers;
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * N212 — reverse-proxy a registered project's dashboard under `/p/<id>/*` so the
 * whole hub lives on one origin (prerequisite for the PWA + unified notifications).
 *
 * Streaming: everything except the SPA shell HTML is piped straight through
 * unbuffered, so the dashboard's `text/event-stream` SSE stays live (no
 * buffering, no content-length). The HTML shell is small, so it is buffered and
 * lightly rewritten: absolute `/assets/` refs are prefixed to `/p/<id>/assets/`
 * (so the browser fetches them back through the proxy), and a base hook is
 * injected (`<base>` + `window.__IF_BASE__`) for the client to consume in N215.
 */
function proxyToProject(
  targetBase: string,
  prefix: string,
  rest: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  let target: URL;
  try {
    target = new URL(rest || "/", targetBase);
  } catch {
    res.writeHead(502, { "Content-Type": MIME_JSON });
    res.end(JSON.stringify({ error: "bad proxy target" }));
    return;
  }
  // SSRF guard: only ever proxy to a local dashboard (see LOOPBACK_HOSTS note).
  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    res.writeHead(403, { "Content-Type": MIME_JSON });
    res.end(JSON.stringify({ error: "proxy target must be loopback" }));
    return;
  }
  const headers = stripHopByHop({ ...req.headers });
  delete headers.host; // let the request default to the target host
  delete headers["accept-encoding"]; // avoid compressed bodies we might rewrite

  const proxyReq = httpRequest(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const status = proxyRes.statusCode ?? 200;
      const ctype = String(proxyRes.headers["content-type"] ?? "");
      if (ctype.includes("text/html")) {
        // Buffer the shell, rewrite asset refs + inject the base hook.
        const chunks: Buffer[] = [];
        proxyRes.on("data", (c: Buffer) => chunks.push(c));
        proxyRes.on("end", () => {
          let html = Buffer.concat(chunks).toString("utf8");
          html = html.replace(/(["'(])\/assets\//g, `$1${prefix}/assets/`);
          // Escape the prefix into both sinks: HTML-attr escaping for <base>,
          // and < so a `</script>` in the prefix can't break out of the tag.
          const baseHref = escapeHtmlAttr(prefix + "/");
          const baseJs = JSON.stringify(prefix + "/").replace(/</g, "\\u003c");
          const hook = `<base href="${baseHref}"><script>window.__IF_BASE__=${baseJs}</script>`;
          html = html.includes("<head>") ? html.replace("<head>", `<head>${hook}`) : hook + html;
          const out = stripHopByHop({ ...proxyRes.headers });
          delete out["content-length"]; // length changed by the rewrite
          res.writeHead(status, out as Record<string, string>);
          res.end(html);
        });
        return;
      }
      // Everything else (assets, JSON APIs, and — crucially — SSE) streams
      // through unbuffered so event frames arrive incrementally. Drop hop-by-hop
      // headers (incl. transfer-encoding — Node re-frames the piped body).
      res.writeHead(status, stripHopByHop({ ...proxyRes.headers }) as Record<string, string>);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": MIME_JSON });
      res.end(JSON.stringify({ error: "proxy target unreachable: " + (err as Error).message }));
    } else {
      res.end();
    }
  });
  // When the client disconnects (esp. an SSE tab closing), tear down the upstream
  // request so we don't leak a held-open connection to the project server.
  res.on("close", () => proxyReq.destroy());
  req.pipe(proxyReq); // forward the request body (POST/PUT)
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

      // N212 — reverse-proxy a registered project's dashboard under /p/<id>/*.
      // Single-origin hub: the master serves each project through this prefix so
      // a service worker / one notification permission / a PWA become possible.
      const proxyMatch = /^\/p\/([^/]+)(\/.*)?$/.exec(url.pathname);
      if (proxyMatch) {
        const pid = decodeURIComponent(proxyMatch[1]);
        const rest = (proxyMatch[2] ?? "/") + url.search;
        const entry = registry.getById(pid) ?? registry.getAll().find((e) => e.projectId === pid);
        if (!entry || !entry.url) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: `No registered project '${pid}'` }));
          return;
        }
        proxyToProject(entry.url, `/p/${proxyMatch[1]}`, rest, req, res);
        return;
      }

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
