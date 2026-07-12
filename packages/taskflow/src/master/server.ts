import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, sep, dirname } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { createServer as netCreateServer } from "node:net";
import { fileURLToPath } from "node:url";
import type { MasterServerConfig, MasterProjectState } from "./types.js";
import * as registry from "./registry.js";
import { getOverviewHtml } from "./overview.js";
import { initProject } from "../agents/init/index.js";
import { readHubRegistry, assignHubPort } from "../core/global-config.js";

/** N210 — where "New project" scaffolds live, so a non-coder never picks a path. */
export function projectsHomeRoot(): string {
  return process.env.INSIGHT_FLOW_PROJECTS_HOME || resolve(homedir(), "insight-flow-projects");
}

const MIME_JSON = "application/json; charset=utf-8";
const MIME_HTML = "text/html; charset=utf-8";

/** N216 — the bundled notification mp3s live in dist/sounds (same as the
 *  dashboard). Served from the master origin so hub sounds work everywhere. */
const MASTER_SOUNDS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "sounds");

/**
 * N216/N217 — the master-origin service worker: one SW for the whole hub. It
 * powers unified notifications (`registration.showNotification`, fires while the
 * hub is backgrounded) AND makes the hub an installable PWA with an offline app
 * shell. Caching strategy (N217): the shell (`/`) is network-first — fresh when
 * online, the cached shell when offline (no white screen); static assets
 * (manifest, icons, sounds) are cache-first. The live surfaces — `/p/<id>/*`,
 * `/api/*`, `/events` — are NEVER cached (always network). Old caches are pruned
 * on activate.
 */
const MASTER_SW_JS = `var CACHE = 'if-hub-v3';
var SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-maskable.svg', '/sounds/idle-ping.mp3', '/sounds/permission-alert.mp3'];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if (k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // Live surfaces are always network — never cached (N220 adds /project/*).
  if (url.pathname.indexOf('/project/') === 0 || url.pathname.indexOf('/p/') === 0 || url.pathname.indexOf('/api/') === 0 || url.pathname === '/events') return;
  if (e.request.mode === 'navigate') {
    // Shell: fresh when online, cached shell when offline.
    e.respondWith(
      fetch(e.request).then(function(res){
        // Only cache an OK shell — never let a 404/500 poison the offline shell.
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put('/', copy); }); }
        return res;
      }).catch(function(){ return caches.match('/'); })
    );
    return;
  }
  // Static assets: cache-first, populate on first fetch.
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); }
        return res;
      });
    })
  );
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function(list){
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) {
        list[i].navigate && list[i].navigate(target);
        return list[i].focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  }));
});`;

/** N217 — the PWA manifest, served on the master origin (start_url = the hub). */
const MASTER_MANIFEST = JSON.stringify({
  name: "insight-flow hub",
  short_name: "insight-flow",
  description: "One hub for all your insight-flow projects.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#0a0a0a",
  theme_color: "#0a0a0a",
  icons: [
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
  ],
});

/** N217 — self-contained SVG app icon (a small flow graph on the hub's dark bg). */
const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="insight-flow">' +
  '<rect width="512" height="512" rx="96" fill="#0a0a0a"/>' +
  '<path d="M176 256 L336 160 M176 256 L336 352" stroke="#e5e5e5" stroke-width="18" stroke-linecap="round"/>' +
  '<circle cx="176" cy="256" r="44" fill="#3b82f6"/>' +
  '<circle cx="336" cy="160" r="44" fill="#22c55e"/>' +
  '<circle cx="336" cy="352" r="44" fill="#a855f7"/>' +
  "</svg>";

/** N217 — maskable variant: full-bleed square bg + content inside the safe zone. */
const ICON_MASKABLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="insight-flow">' +
  '<rect width="512" height="512" fill="#0a0a0a"/>' +
  '<g transform="translate(102 102) scale(0.6)">' +
  '<path d="M176 256 L336 160 M176 256 L336 352" stroke="#e5e5e5" stroke-width="18" stroke-linecap="round"/>' +
  '<circle cx="176" cy="256" r="44" fill="#3b82f6"/>' +
  '<circle cx="336" cy="160" r="44" fill="#22c55e"/>' +
  '<circle cx="336" cy="352" r="44" fill="#a855f7"/>' +
  "</g></svg>";

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

/** True if the host is loopback. Shared by the proxy (N212) and the health
 *  probe (N214) so a registrant-controlled url can never point either at a
 *  non-local host (SSRF / open-proxy). */
function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}
function isLoopbackUrl(u: string): boolean {
  try {
    return isLoopbackHost(new URL(u).hostname);
  } catch {
    return false;
  }
}

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

/** N218 — the preferred port if the OS has it free, else the next free one.
 *  Avoids spawning a dashboard onto a port an unrelated app already holds.
 *  Binds with NO host — the same all-interfaces (dual-stack) bind the dashboard
 *  itself uses — so a port that's busy on IPv6 isn't wrongly seen as free. */
async function findFreePort(preferred: number): Promise<number> {
  const isFree = (p: number): Promise<boolean> =>
    new Promise((res) => {
      const srv = netCreateServer();
      srv.once("error", () => res(false));
      srv.once("listening", () => srv.close(() => res(true)));
      srv.listen(p);
    });
  let p = preferred;
  for (let i = 0; i < 50; i++) {
    if (await isFree(p)) return p;
    p += 1;
  }
  return preferred;
}

/** N218 — a request that wants an HTML page (a browser navigation), so proxy
 *  failures show a friendly page instead of raw JSON. */
function wantsHtml(req: IncomingMessage): boolean {
  return String(req.headers.accept ?? "").includes("text/html");
}

/** N218 — a small hub-styled error page with a link back to the switcher. */
function hubErrorPage(heading: string, detail: string): string {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>insight-flow hub</title>' +
    "<style>body{font-family:'SF Mono','Fira Code',monospace;background:#0a0a0a;color:#e5e5e5;" +
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}" +
    ".box{text-align:center;max-width:440px;padding:24px}.h{font-size:18px;margin-bottom:10px}" +
    ".d{color:#737373;font-size:13px;margin-bottom:22px;line-height:1.6}" +
    "a{display:inline-block;background:#141414;border:1px solid #262626;border-radius:6px;" +
    "padding:8px 14px;color:#3b82f6;text-decoration:none;font-size:13px}a:hover{border-color:#3b82f6}</style>" +
    '</head><body><div class="box"><div class="h">' +
    heading +
    '</div><div class="d">' +
    detail +
    '</div><a href="/">← Back to the hub</a></div></body></html>'
  );
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * N218/N220 — respond when a project path can't be proxied: a friendly HTML page
 * for a browser navigation, JSON otherwise. `entry` present but with no live url
 * → registered-but-not-running (502 for HTML); absent → unknown project (404).
 */
function respondNoProject(
  req: IncomingMessage,
  res: ServerResponse,
  entry: { url: string } | undefined,
  pid: string,
): void {
  if (wantsHtml(req)) {
    res.writeHead(entry ? 502 : 404, { "Content-Type": MIME_HTML });
    res.end(
      entry
        ? hubErrorPage(
            "This project isn’t running",
            "It’s registered with the hub but not live right now. Go back and press “Start” on its card.",
          )
        : hubErrorPage(
            "Project not found",
            "No project with this id is registered with the hub. It may have been removed, or the hub restarted.",
          ),
    );
  } else {
    res.writeHead(404, { "Content-Type": MIME_JSON });
    res.end(JSON.stringify({ error: `No registered project '${pid}'` }));
  }
}

/**
 * N212/N220 — reverse-proxy a registered project's dashboard under the caller's
 * `prefix` (canonically `/project/<projectId>`) so the whole hub lives on one
 * origin (prerequisite for the PWA + unified notifications).
 *
 * Streaming: everything except the SPA shell HTML is piped straight through
 * unbuffered, so the dashboard's `text/event-stream` SSE stays live (no
 * buffering, no content-length). The HTML shell is small, so it is buffered and
 * lightly rewritten: absolute `/assets/` refs are prefixed to `<prefix>/assets/`
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
  if (!isLoopbackHost(target.hostname)) {
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
          // N215 — a floating "Hub" link back to the switcher, so you can jump
          // to another project from inside a project view. `href="/"` is absolute
          // (ignores <base>) → the master root.
          const hubLink =
            '<a href="/" title="Back to the hub / switch project" style="position:fixed;top:8px;left:8px;z-index:2147483647;' +
            "background:#141414;color:#e5e5e5;border:1px solid #333;border-radius:6px;padding:4px 8px;" +
            'font:12px/1 monospace;text-decoration:none;opacity:.85">⌂ Hub</a>';
          html = html.includes("</body>")
            ? html.replace("</body>", hubLink + "</body>")
            : html + hubLink;
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
      if (wantsHtml(req)) {
        res.writeHead(502, { "Content-Type": MIME_HTML });
        res.end(
          hubErrorPage(
            "Couldn’t reach this project",
            "The project’s server isn’t responding — it may have stopped or crashed. Go back to the hub and start it again.",
          ),
        );
      } else {
        res.writeHead(502, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ error: "proxy target unreachable: " + (err as Error).message }));
      }
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

  // N220 review-fix — ids with a spawn in flight, so a second /start (e.g. from a
  // double-click) doesn't launch a second dashboard process for the same project.
  const startingProjects = new Set<string>();
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

      // N212/N220 — reverse-proxy a registered project's dashboard under the
      // canonical `/project/<projectId>/*`. Single-origin hub: the master serves
      // each project through this prefix so a service worker / one notification
      // permission / a PWA become possible. N220 — keyed on the STABLE `projectId`
      // (falls back to the registry id) so the URL survives a master restart
      // (the id is a per-registration UUID; projectId is the project's name).
      const projectMatch = /^\/project\/([^/]+)(\/.*)?$/.exec(url.pathname);
      if (projectMatch) {
        const pid = decodeURIComponent(projectMatch[1]);
        const restPath = projectMatch[2] ?? "/";
        const rest = restPath + url.search;
        // N219 review-fix (blocker 2) — never proxy a project's `/hub/*`
        // control-plane routes (e.g. `/hub/reregister`). Those are localhost-only
        // project↔master endpoints that trust a loopback source address; the
        // proxy would let a LAN peer reach them from the master's own loopback
        // socket, defeating the gate. They are never meant for a browser.
        if (restPath === "/hub" || restPath.startsWith("/hub/")) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        const entry = registry.getByProjectId(pid) ?? registry.getById(pid);
        if (!entry || !entry.url) {
          respondNoProject(req, res, entry, pid);
          return;
        }
        proxyToProject(
          entry.url,
          `/project/${encodeURIComponent(entry.projectId)}`,
          rest,
          req,
          res,
        );
        return;
      }

      // N220 — back-compat: the old `/p/<id>/*` path 301-redirects to the
      // canonical `/project/<projectId>/*`, so open tabs, the cached PWA shell,
      // and any bookmarks keep working after the rename.
      const legacyMatch = /^\/p\/([^/]+)(\/.*)?$/.exec(url.pathname);
      if (legacyMatch) {
        const pid = decodeURIComponent(legacyMatch[1]);
        const restPath = legacyMatch[2] ?? "/";
        // Never redirect (or reveal) control-plane routes — mirror the /project/
        // guard so `/p/<id>/hub/*` 404s directly instead of 301-hopping to it.
        if (restPath === "/hub" || restPath.startsWith("/hub/")) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        const entry = registry.getById(pid) ?? registry.getByProjectId(pid);
        if (!entry) {
          respondNoProject(req, res, undefined, pid);
          return;
        }
        const location = `/project/${encodeURIComponent(entry.projectId)}${restPath}${url.search}`;
        // no-store: 301s are cached indefinitely by browsers; avoid a stale
        // redirect resolving to a different project if a projectId is reused.
        res.writeHead(301, { Location: location, "Cache-Control": "no-store" });
        res.end();
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
        // N215 — dashboards always register from localhost, so gate register to
        // loopback callers. This closes the root cause behind the earlier
        // proxy/probe SSRF guards (N212/N214) and the start-cwd surface: a LAN
        // peer can no longer inject a registrant-controlled url/path into the hub.
        const remote = req.socket.remoteAddress ?? "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "register is localhost-only" }));
          return;
        }
        if (config.standalone) {
          res.writeHead(503, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Master running in standalone mode" }));
          return;
        }
        const body = await readBody(req);
        let parsed: { label?: unknown; url?: unknown; projectId?: unknown; path?: unknown };
        try {
          parsed = JSON.parse(body) as typeof parsed;
        } catch {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
        const label = String(parsed.label ?? "unknown");
        const projectUrl = String(parsed.url ?? "");
        const projectId = String(parsed.projectId ?? parsed.label ?? "unknown");
        const path = typeof parsed.path === "string" ? parsed.path : undefined;
        // N214 — returns a per-project token the project echoes on later calls.
        const { id, token } = registry.upsert(projectId, label, projectUrl, { path });
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", registry.toPublicView(entry));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ id, token }));
        return;
      }

      // POST /api/projects/:id/update
      const updateMatch = /^\/api\/projects\/([^/]+)\/update$/.exec(url.pathname);
      if (req.method === "POST" && updateMatch) {
        const id = updateMatch[1];
        if (!registry.verifyToken(id, url.searchParams.get("token") ?? undefined)) {
          res.writeHead(401, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Unknown project id or bad token" }));
          return;
        }
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
        if (entry) broadcast("project-update", registry.toPublicView(entry));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // POST /api/projects/:id/status
      const statusMatch = /^\/api\/projects\/([^/]+)\/status$/.exec(url.pathname);
      if (req.method === "POST" && statusMatch) {
        const id = statusMatch[1];
        if (!registry.verifyToken(id, url.searchParams.get("token") ?? undefined)) {
          res.writeHead(401, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Unknown project id or bad token" }));
          return;
        }
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
        if (entry) broadcast("project-update", registry.toPublicView(entry));
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
        const { id } = registry.upsert(slug, name, "", { path: dir });
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", registry.toPublicView(entry));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ id, name, path: dir }));
        return;
      }

      // N214 — GET /api/hub/projects — the registered projects + live status
      // (id, label, url, online, lastSeenAt). Consumed by the switcher (N215).
      if (req.method === "GET" && url.pathname === "/api/hub/projects") {
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ projects: registry.getAllPublic() }));
        return;
      }

      // N214 — GET /api/hub/live?id&token — the passive liveness channel. While
      // this SSE connection is open the project is `online`; on close → offline.
      // No polling: liveness is the connection's lifetime.
      if (req.method === "GET" && url.pathname === "/api/hub/live") {
        const id = url.searchParams.get("id") ?? "";
        if (!registry.verifyToken(id, url.searchParams.get("token") ?? undefined)) {
          res.writeHead(401, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Unknown project id or bad token" }));
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.write("retry: 2000\n\n");
        registry.setOnline(id, true);
        {
          const entry = registry.getById(id);
          if (entry) broadcast("project-update", registry.toPublicView(entry));
        }
        const heartbeat = setInterval(() => {
          try {
            res.write(": ping\n\n");
          } catch {
            /* stream gone */
          }
        }, 25000);
        req.on("close", () => {
          clearInterval(heartbeat);
          registry.setOnline(id, false);
          const entry = registry.getById(id);
          if (entry) broadcast("project-update", registry.toPublicView(entry));
        });
        return;
      }

      // N214 — POST /api/hub/refresh — on-demand active healthcheck. Probes every
      // registered project's /health concurrently (short timeout) and updates
      // online/lastSeenAt. Runs ONLY when called (switcher popup / manual
      // refresh) — there is no background timer.
      if (req.method === "POST" && url.pathname === "/api/hub/refresh") {
        // SSRF guard: only probe loopback dashboards. A registrant-controlled
        // url must never make the master fetch an arbitrary (internal) host.
        const entries = registry.getAll().filter((e) => e.url && isLoopbackUrl(e.url));
        await Promise.all(
          entries.map(async (e) => {
            let ok = false;
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 1500);
            try {
              const r = await fetch(`${e.url}/health?token=${encodeURIComponent(e.token)}`, {
                signal: ctrl.signal,
              });
              ok = r.ok;
            } catch {
              ok = false;
            } finally {
              clearTimeout(t);
            }
            registry.setOnline(e.id, ok);
          }),
        );
        for (const e of registry.getAllPublic()) broadcast("project-update", e);
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ projects: registry.getAllPublic() }));
        return;
      }

      // N215 — POST /api/hub/projects/:id/start — spawn an offline project's
      // dashboard (localhost-only; it execs + writes), then wait until reachable.
      // The dashboard registers on boot (reconciling by path), so the entry gets
      // its live url + goes online. Returns { url } for the client to route to.
      const startMatch = /^\/api\/hub\/projects\/([^/]+)\/start$/.exec(url.pathname);
      if (req.method === "POST" && startMatch) {
        const remote = req.socket.remoteAddress ?? "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "start is localhost-only" }));
          return;
        }
        const entry = registry.getById(startMatch[1]);
        if (!entry || !entry.path) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "unknown project or no known path" }));
          return;
        }
        // Already live (authoritative from the liveness signal, not a port guess).
        if (entry.online && entry.url) {
          res.writeHead(200, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ url: entry.url, alreadyRunning: true }));
          return;
        }
        // N220 review-fix — a spawn is already in flight for this project; don't
        // launch a second dashboard process (guards against a double-click).
        if (startingProjects.has(entry.id)) {
          res.writeHead(202, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ starting: true }));
          return;
        }
        startingProjects.add(entry.id);
        try {
          const hub = readHubRegistry().find((h) => h.path === entry.path);
          // Use a genuinely free port (the assigned one if free, else the next),
          // so a port an unrelated app holds doesn't make the spawn crash silently.
          const port = await findFreePort(hub?.port ?? assignHubPort());
          try {
            const selfCli = resolve(dirname(fileURLToPath(import.meta.url)), "cli.js");
            const child = spawn(process.execPath, [selfCli, "ui", "--port", String(port)], {
              cwd: entry.path,
              detached: true,
              stdio: "ignore",
            });
            child.unref();
          } catch (err) {
            res.writeHead(500, { "Content-Type": MIME_JSON });
            res.end(JSON.stringify({ error: `Could not start: ${(err as Error).message}` }));
            return;
          }
          // Wait for the dashboard to actually REGISTER with the hub (reconcile by
          // path → this entry gets its url + goes online), not merely for the port
          // to answer — otherwise the proxy would have no target.
          const deadline = Date.now() + 15000;
          let live = registry.getById(entry.id);
          while (Date.now() < deadline && !(live && live.online && live.url)) {
            await new Promise((r) => setTimeout(r, 250));
            live = registry.getById(entry.id);
          }
          if (!live || !live.online || !live.url) {
            res.writeHead(504, { "Content-Type": MIME_JSON });
            res.end(
              JSON.stringify({
                error: "project started but did not register with the hub in time",
              }),
            );
            return;
          }
          res.writeHead(200, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ url: live.url }));
          return;
        } finally {
          startingProjects.delete(entry.id);
        }
      }

      // N217 — GET /manifest.webmanifest + app icons (the installable PWA).
      if (req.method === "GET" && url.pathname === "/manifest.webmanifest") {
        res.writeHead(200, {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(MASTER_MANIFEST);
        return;
      }
      if (
        req.method === "GET" &&
        (url.pathname === "/icon.svg" || url.pathname === "/icon-maskable.svg")
      ) {
        res.writeHead(200, {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "max-age=86400",
        });
        res.end(url.pathname === "/icon-maskable.svg" ? ICON_MASKABLE_SVG : ICON_SVG);
        return;
      }

      // N216 — GET /sw.js: the master-origin service worker (root scope).
      if (req.method === "GET" && url.pathname === "/sw.js") {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Service-Worker-Allowed": "/",
          "Cache-Control": "no-cache",
        });
        res.end(MASTER_SW_JS);
        return;
      }

      // N216 — GET /sounds/<file>.mp3: the bundled notification sounds, served
      // from the master origin so hub notifications can play them.
      if (req.method === "GET" && url.pathname.startsWith("/sounds/")) {
        const file = url.pathname.slice("/sounds/".length);
        if (!file || file.includes("..") || file.includes("/") || !file.endsWith(".mp3")) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "bad sound" }));
          return;
        }
        const soundPath = resolve(MASTER_SOUNDS_DIR, file);
        if (!soundPath.startsWith(MASTER_SOUNDS_DIR + sep) || !existsSync(soundPath)) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "not found" }));
          return;
        }
        const data = readFileSync(soundPath);
        res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": String(data.length) });
        res.end(data);
        return;
      }

      // GET / or /overview — the hub shell / switcher (N215 serves it at the
      // root too, so it's the PWA start_url and the landing page).
      if (req.method === "GET" && (url.pathname === "/overview" || url.pathname === "/")) {
        res.writeHead(200, { "Content-Type": MIME_HTML });
        res.end(getOverviewHtml(registry.getAllPublic()));
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
