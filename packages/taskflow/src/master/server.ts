import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, sep, dirname, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { createServer as netCreateServer } from "node:net";
import { fileURLToPath } from "node:url";
import type { MasterServerConfig, MasterProjectState } from "./types.js";
import * as registry from "./registry.js";
import { initProject } from "../agents/init/index.js";
import { readHubRegistry, assignHubPort } from "../core/global-config.js";
import { appendLog, readMerged } from "../core/log-store.js";
import { LogInputSchema } from "../core/schema/index.js";

/**
 * N242 — the shared debug-log write path. Resolves the project from the log key
 * (a project's registration token, or the reserved `"master"` key), validates
 * the payload, enriches it, and appends it to the store. The master calls this
 * directly for its own logs (no self-HTTP); the `POST /log` route calls it too.
 */
export function recordLog(key: string, log: unknown): "ok" | "bad-key" | "bad-body" {
  const projectName = key === "master" ? "master" : (registry.getByToken(key)?.projectId ?? null);
  if (!projectName) return "bad-key";
  const parsed = LogInputSchema.safeParse(log);
  if (!parsed.success) return "bad-body";
  appendLog({ ...parsed.data, timestamp: new Date().toISOString(), projectName });
  return "ok";
}

/** N210 — where "New project" scaffolds live, so a non-coder never picks a path. */
export function projectsHomeRoot(): string {
  return process.env.INSIGHT_FLOW_PROJECTS_HOME || resolve(homedir(), "insight-flow-projects");
}

/**
 * N221 — the ceiling for the "New project" folder browser. The fs-list + create
 * endpoints may only read/create inside this (realpath-checked), so the hub can
 * never touch the filesystem outside it. Defaults to the user's home dir.
 */
export function browseRoot(): string {
  return process.env.INSIGHT_FLOW_BROWSE_ROOT || homedir();
}

/**
 * N221 — resolve `p` to its real path and require it to sit inside `root` (also
 * real-pathed), defeating symlink escapes and `..` traversal. Returns the real
 * path, or null if it escapes / doesn't exist. `p` must be an existing dir.
 */
function realDirWithinRoot(p: string, root: string): string | null {
  try {
    const realRoot = realpathSync(root);
    const real = realpathSync(p);
    if (real === realRoot || real.startsWith(realRoot + sep)) return real;
    return null;
  } catch {
    return null;
  }
}

/**
 * N233 — resolve the `info/exclude` file git actually reads for the repo at
 * `repoRoot`. A normal repo → `<repoRoot>/.git/info/exclude`. A worktree or
 * submodule has a `.git` *file* (gitlink "gitdir: <path>"), and git reads the
 * COMMON dir's exclude — so follow the gitlink, then its `commondir`, and use
 * `<commonDir>/info/exclude`. Returns null if `.git` is missing or unresolvable.
 */
function gitInfoExcludePath(repoRoot: string): string | null {
  const dotGit = resolve(repoRoot, ".git");
  let st;
  try {
    st = statSync(dotGit);
  } catch {
    return null;
  }
  if (st.isDirectory()) return resolve(dotGit, "info", "exclude");
  let gitDir: string;
  try {
    const m = readFileSync(dotGit, "utf-8").match(/^gitdir:\s*(.+)$/m);
    if (!m) return null;
    const raw = m[1].trim();
    gitDir = isAbsolute(raw) ? raw : resolve(repoRoot, raw);
  } catch {
    return null;
  }
  // A stale/pruned worktree or broken gitlink points at a gitdir that no longer
  // exists — writing there would be a no-op git never reads, so bail (the caller
  // surfaces a warning instead of silently "ignoring" nothing).
  if (!existsSync(gitDir)) return null;
  let commonDir = gitDir;
  try {
    const cd = readFileSync(resolve(gitDir, "commondir"), "utf-8").trim();
    commonDir = isAbsolute(cd) ? cd : resolve(gitDir, cd);
  } catch {
    // No `commondir` file (e.g. a submodule gitdir) → gitDir is the common dir.
  }
  if (!existsSync(commonDir)) return null;
  return resolve(commonDir, "info", "exclude");
}

/**
 * N233 — idempotently ignore the newly created project's subfolder from the
 * enclosing git repo. `repoRoot` is the folder the user browsed to (which must
 * hold a `.git`); `rules` are anchored to the repo root (e.g. `/<slug>/` for a
 * subfolder project, or the specific footprint files for an in-place project — so
 * we never ignore a shared `.claude/`). `mode: "shared"` writes the committed
 * `.gitignore`; `mode: "local"` writes the repo-local `info/exclude` (not
 * committed), resolved for worktrees/submodules. Skips rules already present.
 * Returns true if any line was written.
 */
function ignoreProjectFolder(repoRoot: string, rules: string[], mode: "shared" | "local"): boolean {
  const path = mode === "shared" ? resolve(repoRoot, ".gitignore") : gitInfoExcludePath(repoRoot);
  if (!path) throw new Error("could not locate the repo's info/exclude file");
  // Refuse to read/write through a symlinked target — `readFileSync`/`writeFileSync`
  // follow symlinks, which would let a pre-existing symlink at the ignore file
  // escape the realpath confinement the rest of the endpoint enforces. `lstat`
  // (not `existsSync`, which follows the link) so a *dangling* symlink is caught
  // too — otherwise the write would create its out-of-tree target. (We do not
  // realpath-confine the resolved gitdir itself: a legitimate worktree's common dir
  // may sit outside the browse root, so confining it would reject valid setups.)
  let targetIsSymlink = false;
  try {
    targetIsSymlink = lstatSync(path).isSymbolicLink();
  } catch (err) {
    // ENOENT — no file at `path` yet; nothing to follow, safe to create.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  if (targetIsSymlink) {
    throw new Error("refusing to write through a symlinked ignore file");
  }
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const lines = existing.split("\n").map((l) => l.trim());
  const missing = rules.filter((r) => !lines.includes(r));
  if (!missing.length) return false;
  // The target's parent (`<gitdir>/info`, or a brand-new `.gitignore`'s dir) may
  // not exist yet; create it defensively.
  mkdirSync(dirname(path), { recursive: true });
  const prefix = existing.length ? (existing.endsWith("\n") ? "\n" : "\n\n") : "";
  const block = `${prefix}# insight-flow — task workbench (do not commit)\n${missing.join("\n")}\n`;
  writeFileSync(path, existing + block, "utf-8");
  return true;
}

const MIME_JSON = "application/json; charset=utf-8";
const MIME_HTML = "text/html; charset=utf-8";

// N228 — time-to-first-byte ceiling for a proxied request. A healthy project
// answers in ~1ms even under load, so 15s only ever fires on a wedged / half-
// open / stale-port upstream — turning a multi-minute hang into a fast 504 +
// self-heal. Cleared the instant the upstream response begins, so long-lived
// SSE streams (which send their first bytes immediately) are never killed.
const PROXY_TTFB_TIMEOUT_MS = 15_000;

/** N216 — the bundled notification mp3s live in dist/sounds (same as the
 *  dashboard). Served from the master origin so hub sounds work everywhere. */
const MASTER_SOUNDS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "sounds");

/**
 * N231 — the built master overview React island. Vite builds `src/master/client`
 * into `dist/master` (index.html + assets/*), resolved here relative to the
 * bundled server file (same pattern as the sounds dir). The server serves the
 * shell at `/` and `/overview` and the bundle at `/assets/*`.
 */
const MASTER_CLIENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "master");
const MASTER_ASSETS_DIR = resolve(MASTER_CLIENT_DIR, "assets");
const MASTER_ASSET_MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// The shell rarely changes (only on a rebuild → server restart), so read + patch
// it once. `/hub-notify.js` (the shared notification client, N225) is injected
// here rather than baked into index.html so the built shell stays free of a
// script Vite would try to resolve at build time.
let overviewShellCache: string | null = null;
// N245 — inject a snippet before the *last* `</body>`. `String.replace` would
// hit the FIRST match, and an HTML comment can legally contain the literal
// `</body>` (the shell's own comment did), which buried the notify script in a
// comment so it never ran. `lastIndexOf` targets the real closing tag; if there
// is none, append.
function injectBeforeBodyClose(html: string, snippet: string): string {
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + snippet : html.slice(0, i) + snippet + html.slice(i);
}

function getOverviewShell(): string {
  if (overviewShellCache !== null) return overviewShellCache;
  let html: string;
  try {
    html = readFileSync(resolve(MASTER_CLIENT_DIR, "index.html"), "utf8");
  } catch {
    // Not built yet — a minimal shell so the route still answers (and boots the
    // dev message instead of a 500). Not cached, so a later build is picked up.
    return (
      '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      "<title>Insight Flow — Overview</title></head><body>" +
      "<p>The master overview is not built. Run <code>pnpm build</code>.</p>" +
      "</body></html>"
    );
  }
  const notifyTag = '<script src="/hub-notify.js" defer></script>';
  if (!html.includes(notifyTag)) html = injectBeforeBodyClose(html, notifyTag);
  overviewShellCache = html;
  return html;
}

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

/**
 * N225/N238 — the shared hub notification client, served at `/hub-notify.js` and
 * injected into EVERY hub page (the overview AND every proxied `/project/<id>/`
 * shell). It registers the SW, holds the master `/events` SSE, and fires
 * `swReg.showNotification` on task-status transitions AND on a project's
 * `claudeStatus` going active→done or → permission.
 *
 * N238 — the source now lives in `src/master/client/hub-notify.ts` (a real
 * module sharing the settings/watched-status model with the settings UI), built
 * by vite into `dist/master/hub-notify.js`. Read + cached once; a minimal no-op
 * shim is returned when the bundle isn't built yet so the route still answers.
 */
const HUB_NOTIFY_FALLBACK = "/* hub-notify not built — run `pnpm build` */";
let hubNotifyCache: string | null = null;
function getHubNotifyJs(): string {
  if (hubNotifyCache !== null) return hubNotifyCache;
  try {
    hubNotifyCache = readFileSync(resolve(MASTER_CLIENT_DIR, "hub-notify.js"), "utf8");
  } catch {
    return HUB_NOTIFY_FALLBACK; // not cached — a later build is picked up
  }
  return hubNotifyCache;
}

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

/** The hostname of a `Host` (host:port) or `Origin` (scheme://host:port) header
 *  value, or "" if unparseable. */
function headerHost(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value.includes("://") ? value : "http://" + value).hostname;
  } catch {
    return "";
  }
}

/**
 * N223 — extra hosts the user has *explicitly* allowlisted for the hub
 * control-plane (their LAN IP / hostname), so the installable PWA works over the
 * LAN / on mobile. Read from `INSIGHT_FLOW_TRUSTED_HOSTS` (comma-separated, each
 * a bare host or `host:port`, IP or hostname), normalized to a hostname via
 * `headerHost`. Parsed per-request (cheap; gated endpoints are user-frequency)
 * so it stays honest under tests that set/restore the env. Empty/unset ⇒ empty
 * set ⇒ localhost-only, exactly as before N223.
 */
function trustedHostSet(): Set<string> {
  const set = new Set<string>();
  const raw = process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  if (!raw) return set;
  for (const part of raw.split(",")) {
    const h = headerHost(part.trim());
    if (h) set.add(h);
  }
  return set;
}

/** True if the host is loopback OR an explicitly-allowlisted trusted host (N223).
 *  Loopback is always trusted regardless of the env. */
function isTrustedHost(hostname: string, trusted: Set<string>): boolean {
  return isLoopbackHost(hostname) || trusted.has(hostname);
}

/**
 * N221 review-fix — is this a trusted, same-machine same-origin request to a
 * sensitive local endpoint (folder listing / project creation / start)? The
 * server binds all interfaces and sets `Access-Control-Allow-Origin: *`, so a
 * loopback `remoteAddress` alone does NOT keep a remote website out. A request
 * is trusted only if:
 *   - its `Host` header host is loopback (or an N223-allowlisted host) — this
 *     defeats **DNS rebinding**, where the socket lands on 127.0.0.1 but the
 *     browser sends the attacker's hostname in `Host`;
 *   - it carries no cross-origin `Origin` (a cross-origin browser fetch sends an
 *     `Origin` whose host is not loopback/allowlisted); and
 *   - its `Sec-Fetch-Site`, if present, is `same-origin`/`none` (not cross-site).
 * The hub page itself sends a loopback (or allowlisted) Host + same-origin
 * Origin, so it passes. N223: the allowlist only *widens* the trusted host set
 * to hosts the user named — a cross-origin attacker's Origin is still rejected,
 * and a rebound request still carries the attacker's own hostname (not the
 * allowlisted LAN IP), so neither CSRF nor DNS rebinding is reopened.
 */
function isTrustedLocalRequest(req: IncomingMessage): boolean {
  const trusted = trustedHostSet();
  if (!isTrustedHost(headerHost(req.headers.host), trusted)) return false;
  const origin = req.headers.origin;
  if (origin && !isTrustedHost(headerHost(origin), trusted)) return false;
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}

/** Socket peer addresses that count as the local machine. Distinct from
 *  `LOOPBACK_HOSTS` (which are `Host`-header hostnames a client can forge):
 *  `req.socket.remoteAddress` is the real TCP peer and cannot be spoofed over
 *  the network. */
const LOOPBACK_PEERS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * N223 review-fix (round 2) — the gate for the LAN-reachable **write/exec**
 * endpoints (`/api/fs/list`, `/api/projects/create`, `/api/hub/projects/:id/start`).
 * `isTrustedLocalRequest` is decided purely from headers, so a non-browser LAN
 * client (curl / script) could forge `Host: 127.0.0.1` (no Origin, no
 * Sec-Fetch-Site) and pass it — that would make these filesystem-write / exec
 * endpoints reachable from the network even with the env **unset**. So we keep a
 * peer-IP defense-in-depth on top of the header trust check:
 *   - the Host/Origin/Sec-Fetch checks must pass (defeats browser DNS-rebinding + CSRF);
 *   - a **loopback socket peer** is always allowed (the local machine);
 *   - a **non-loopback peer** is allowed ONLY when the request targets a host the
 *     user *explicitly* allowlisted (`INSIGHT_FLOW_TRUSTED_HOSTS`) — the loopback
 *     shortcut in `isTrustedHost` does NOT count here, so a forged loopback `Host`
 *     from the LAN is rejected.
 * Env unset ⇒ empty allowlist ⇒ every non-loopback peer is rejected ⇒ genuinely
 * localhost-only for all client types, exactly as before N223. Env set ⇒ a real
 * allowlisted LAN host (the PWA on a phone) passes — the accepted N223 trust boundary.
 */
export function isTrustedActionRequest(req: IncomingMessage): boolean {
  if (!isTrustedLocalRequest(req)) return false;
  const remote = req.socket.remoteAddress ?? "";
  if (LOOPBACK_PEERS.has(remote)) return true;
  return trustedHostSet().has(headerHost(req.headers.host));
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
  onUpstreamFail?: (reason: "timeout" | "error") => void,
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

  // N228 — bound the time-to-first-byte only. Fires on a wedged/half-open
  // upstream (multi-minute hang → fast 504); cleared once the response begins so
  // streaming bodies, incl. long-lived SSE, are never interrupted mid-stream.
  const startedAt = Date.now();
  let timedOut = false;
  let settled = false;
  // Abort via a signal (not proxyReq.destroy) so proxyReq can stay `const` — the
  // timer must not reference it before it's created.
  const abort = new AbortController();
  const ttfbTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    timedOut = true;
    // N228 — diagnostic: the next multi-minute stall is now a logged line.
    console.warn(
      `[hub] proxy TTFB timeout after ${PROXY_TTFB_TIMEOUT_MS}ms → 504: ${req.method} ${prefix}${rest}`,
    );
    abort.abort();
  }, PROXY_TTFB_TIMEOUT_MS);
  const clearTtfb = () => {
    settled = true;
    clearTimeout(ttfbTimer);
  };

  const proxyReq = httpRequest(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: req.method,
      headers,
      signal: abort.signal,
    },
    (proxyRes) => {
      clearTtfb();
      // N228 — pipe() does not forward source errors; without this a mid-stream
      // upstream error/reset (e.g. on client-disconnect teardown) would surface
      // as an unhandled 'error' and could crash the process on some Node builds.
      proxyRes.on("error", () => {
        try {
          res.destroy();
        } catch {
          /* already torn down */
        }
      });
      // N228 — flag a slow-but-alive upstream (near the timeout ceiling) so a
      // degrading project is visible before it tips into a full 504.
      const elapsed = Date.now() - startedAt;
      if (elapsed > PROXY_TTFB_TIMEOUT_MS / 3) {
        console.warn(`[hub] slow proxy ${elapsed}ms: ${req.method} ${prefix}${rest}`);
      }
      const status = proxyRes.statusCode ?? 200;
      const ctype = String(proxyRes.headers["content-type"] ?? "");
      if (ctype.includes("text/html")) {
        // Buffer the shell, rewrite asset refs + inject the base hook.
        const chunks: Buffer[] = [];
        proxyRes.on("data", (c: Buffer) => chunks.push(c));
        proxyRes.on("end", () => {
          // N228 — this writeHead is deferred (buffered shell). If the response
          // was already ended by an error/timeout in the interim, don't write
          // again (would throw ERR_HTTP_HEADERS_SENT in a bare callback).
          if (res.headersSent || res.writableEnded || res.destroyed) return;
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
          // N225 — the shared hub notification client, so SW-backed notifications
          // fire while viewing a project too (absolute src → master origin).
          const notifyTag = '<script src="/hub-notify.js" defer></script>';
          html = injectBeforeBodyClose(html, hubLink + notifyTag);
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
    clearTtfb();
    // N228 — self-heal: a wedged/half-open/stale-port upstream is (re)probed so
    // the registry's online flag self-corrects instead of proxying to it again.
    onUpstreamFail?.(timedOut ? "timeout" : "error");
    if (!res.headersSent && !res.writableEnded && !res.destroyed) {
      // 504 for our TTFB timeout (upstream alive but not answering), 502 for a
      // hard connection error (refused/reset). Either way: fast, not a hang.
      const status = timedOut ? 504 : 502;
      if (wantsHtml(req)) {
        res.writeHead(status, { "Content-Type": MIME_HTML });
        res.end(
          hubErrorPage(
            timedOut ? "This project is taking too long" : "Couldn’t reach this project",
            timedOut
              ? "The project’s server accepted the connection but didn’t respond in time — it may be overloaded or wedged. Go back to the hub and try again."
              : "The project’s server isn’t responding — it may have stopped or crashed. Go back to the hub and start it again.",
          ),
        );
      } else {
        res.writeHead(status, { "Content-Type": MIME_JSON });
        res.end(
          JSON.stringify({
            error:
              (timedOut ? "proxy target timed out: " : "proxy target unreachable: ") +
              (err as Error).message,
          }),
        );
      }
    } else {
      res.end();
    }
  });
  // When the client disconnects (esp. an SSE tab closing), tear down the upstream
  // request so we don't leak a held-open connection to the project server.
  res.on("close", () => {
    clearTtfb();
    proxyReq.destroy();
  });
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

  // N228 — probe one project's /health (short timeout, loopback-only) and record
  // the result in the registry. Shared by the on-demand refresh sweep and the
  // proxy self-heal, so a wedged/stale-port upstream flips offline instead of
  // being proxied to again on the next navigation.
  async function probeProjectHealth(e: {
    id: string;
    url?: string;
    token: string;
  }): Promise<boolean> {
    if (!e.url || !isLoopbackUrl(e.url)) return false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    let ok = false;
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
    return ok;
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
          () => {
            // N228 — self-heal: re-probe this project's health and push the
            // corrected online state, so a wedged/stale-port upstream stops
            // being proxied to and the overview reflects reality.
            void probeProjectHealth(entry)
              .then(() => {
                const updated = registry.getById(entry.id);
                if (updated) broadcast("project-update", registry.toPublicView(updated));
              })
              .catch(() => {
                /* self-heal is best-effort; never surface as an unhandled rejection */
              });
          },
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
        // N221 review-fix — reject cross-origin browser POSTs (CSRF): register is
        // called server-to-server by dashboards (Host loopback, no Origin) → this
        // passes; a website POSTing here (to poison a registry url/path) is
        // refused. registry.upsert keys on caller-supplied projectId.
        if (!isTrustedLocalRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
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
        // N243 — log the registration handshake (master side), before minting the code.
        recordLog("master", {
          type: "info",
          message: "registration received",
          data: { projectId, label, url: projectUrl, path },
        });
        // N214 — returns a per-project token the project echoes on later calls.
        const { id, token } = registry.upsert(projectId, label, projectUrl, { path });
        // N243 — code generated (the token itself is a secret — log the id, not it).
        recordLog("master", {
          type: "info",
          message: "generated code",
          data: { projectId, id },
        });
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", registry.toPublicView(entry));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ id, token }));
        return;
      }

      // N242 — POST /log — a project (or the master) records a debug log.
      // Body: { key, log: { type, message, data? } }. Trusted-local only; the key
      // must be a known project token or the reserved "master" key. Fire-and-forget.
      if (req.method === "POST" && url.pathname === "/log") {
        // N242 review-fix — a write endpoint: use the peer-IP guard (parity with
        // fs/create/start), so a non-browser LAN client can't forge Host:127.0.0.1
        // to spam/forge logs (the reserved "master" key is tokenless).
        if (!isTrustedActionRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
        const body = await readBody(req);
        let parsed: { key?: unknown; log?: unknown };
        try {
          parsed = JSON.parse(body) as typeof parsed;
        } catch {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
        const result = recordLog(String(parsed.key ?? ""), parsed.log);
        if (result === "bad-key") {
          res.writeHead(401, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "unknown log key" }));
          return;
        }
        if (result === "bad-body") {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "invalid log (type/message required)" }));
          return;
        }
        res.writeHead(202, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // N242 — GET /api/logs — read stored debug logs, merged + paginated.
      // (Under /api/ so it doesn't collide with the /logs page shell — N244.)
      // ?project=<name>|master|all (default all) &type=error|warning|info &page= &pageSize=
      if (req.method === "GET" && url.pathname === "/api/logs") {
        if (!isTrustedLocalRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
        const project = url.searchParams.get("project") || "all";
        const typeParam = url.searchParams.get("type");
        const type =
          typeParam === "error" || typeParam === "warning" || typeParam === "info"
            ? typeParam
            : undefined;
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
        const pageSize = Math.min(
          500,
          Math.max(1, parseInt(url.searchParams.get("pageSize") || "100", 10) || 100),
        );
        const merged = readMerged({ project, type });
        const start = (page - 1) * pageSize;
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(
          JSON.stringify({
            total: merged.length,
            page,
            pageSize,
            logs: merged.slice(start, start + pageSize),
          }),
        );
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

      // N221 — GET /api/fs/list?dir=<abs> — the "New project" folder browser.
      // Lists sub-directories of `dir` (default: the browse root), confined to
      // browseRoot() via realpath (no `..`/symlink escape). Directories only.
      // N223 — trusted-host-gated: loopback by default, but the user may allowlist
      // LAN hosts (INSIGHT_FLOW_TRUSTED_HOSTS) so the PWA folder browser works from
      // a phone. A trusted LAN client can then read the (browseRoot-confined)
      // listing — accepted trust boundary (documented in N224).
      if (req.method === "GET" && url.pathname === "/api/fs/list") {
        // N221 review-fix / N223 — reject DNS-rebound / cross-origin browser reads
        // (ACAO:* + all-interfaces bind would otherwise leak the home listing).
        // isTrustedActionRequest adds a peer-IP guard: a non-loopback client is
        // only accepted for an explicitly-allowlisted host (a forged loopback Host
        // from the LAN is rejected; env unset ⇒ localhost-only for all clients).
        if (!isTrustedActionRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
        const root = browseRoot();
        const requested = url.searchParams.get("dir") || root;
        const real = realDirWithinRoot(requested, root);
        if (!real) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(
            JSON.stringify({ error: "Folder is outside the allowed root or does not exist" }),
          );
          return;
        }
        let entries: { name: string; isDir: true }[];
        try {
          // N221 review-fix — include symlinks that resolve to directories, so a
          // symlinked project folder (common on dev machines) is still browsable.
          entries = readdirSync(real, { withFileTypes: true })
            .filter((d) => {
              if (d.name.startsWith(".")) return false;
              if (d.isDirectory()) return true;
              if (d.isSymbolicLink()) {
                try {
                  return statSync(resolve(real, d.name)).isDirectory();
                } catch {
                  return false;
                }
              }
              return false;
            })
            .map((d) => ({ name: d.name, isDir: true as const }))
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch {
          res.writeHead(500, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Could not read folder" }));
          return;
        }
        const realRoot = realpathSync(root);
        const parent = real === realRoot ? null : dirname(real);
        // N233 — is this folder itself a git repo root? Drives the New-project
        // modal's gitignore options (shallow: `.git` directly here, no walking up).
        const hasGit = existsSync(resolve(real, ".git"));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ dir: real, root: realRoot, parent, entries, hasGit }));
        return;
      }

      // POST /api/projects/create — N210: scaffold a new project from the home
      // UI (non-coder onboarding). N221 — creates <chosen-dir>/<slug> where the
      // chosen dir is confined to browseRoot() (realpath); runs init, registers
      // it. This endpoint writes to the filesystem + runs init. N223 — trusted-host
      // gated: loopback by default, but an allowlisted LAN host (via
      // INSIGHT_FLOW_TRUSTED_HOSTS) may create a project from the PWA on a phone.
      // Accepted trust boundary: a trusted LAN client can write (browseRoot-confined)
      // + spawn init on the hub host — documented in N224.
      if (req.method === "POST" && url.pathname === "/api/projects/create") {
        // N221 review-fix / N223 — reject DNS-rebound / cross-origin browser POSTs
        // (CSRF — this writes to the filesystem + runs init). isTrustedActionRequest
        // adds a peer-IP guard: a non-loopback client is only accepted for an
        // explicitly-allowlisted host (env unset ⇒ localhost-only for all clients).
        if (!isTrustedActionRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
        const body = await readBody(req);
        let parsed: {
          name?: unknown;
          dir?: unknown;
          lifecycle?: unknown;
          activity?: unknown;
          registerHub?: unknown;
          editor?: unknown;
          installFlows?: unknown;
          gitIgnore?: unknown;
          location?: unknown;
        };
        try {
          parsed = JSON.parse(body) as typeof parsed;
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
        // N221 — the chosen parent folder (from the browser); default the browse
        // root. Confined to browseRoot() by realpath, same as fs-list.
        const root = browseRoot();
        const chosenDir = typeof parsed.dir === "string" && parsed.dir ? parsed.dir : root;
        const realParent = realDirWithinRoot(chosenDir, root);
        if (!realParent) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(
            JSON.stringify({ error: "Chosen folder is outside the allowed root or missing" }),
          );
          return;
        }
        // N236 — init in the selected folder (default), or in a new subfolder
        // named by the project name. slug is a single path segment (the name
        // regex forbids `/` and `.`), so the subfolder can't traverse out.
        const inPlace = parsed.location !== "subfolder";
        const slug = name.replace(/\s+/g, "-").toLowerCase();
        const dir = inPlace ? realParent : resolve(realParent, slug);
        // Confinement (subfolder only — in-place `dir` is `realParent`, already
        // confined). `realParent + sep` collapses to `//` when realParent is the
        // fs root, so normalize the prefix (handles INSIGHT_FLOW_BROWSE_ROOT=/).
        const parentPrefix = realParent.endsWith(sep) ? realParent : realParent + sep;
        if (!inPlace && !dir.startsWith(parentPrefix)) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "Resolved path escapes the chosen folder" }));
          return;
        }
        if (existsSync(resolve(dir, "taskflow.config.json"))) {
          res.writeHead(409, { "Content-Type": MIME_JSON });
          res.end(
            JSON.stringify({ error: `insight-flow is already initialized in this folder: ${dir}` }),
          );
          return;
        }
        // N222 — install options from the modal. `editor` is validated by
        // initProject; `installFlows` is filtered to the known built-in flows so
        // an arbitrary string can't be passed through.
        const editor =
          parsed.editor === "cursor" || parsed.editor === "all" || parsed.editor === "claude"
            ? parsed.editor
            : undefined;
        const installFlows = Array.isArray(parsed.installFlows)
          ? parsed.installFlows.filter((f): f is string => f === "composer-authoring")
          : undefined;
        // N233 — how to gitignore the new project's footprint. Only honored when
        // the chosen parent is itself a git repo root (shallow, no walking up).
        const gitIgnore =
          parsed.gitIgnore === "shared" || parsed.gitIgnore === "local"
            ? parsed.gitIgnore
            : undefined;
        let flowErrors: { id: string; error: string }[] = [];
        let conflicts: string[] = [];
        const gitIgnoreWarnings: string[] = [];
        try {
          mkdirSync(dir, { recursive: true });
          const result = await initProject(dir, false, {
            yes: true,
            lifecycle: parsed.lifecycle === undefined ? undefined : parsed.lifecycle === true,
            activity: parsed.activity === undefined ? undefined : parsed.activity === true,
            registerHub: parsed.registerHub === true,
            editor,
            installFlows,
          });
          flowErrors = result.flowErrors;
          conflicts = result.conflicts;
        } catch (err) {
          res.writeHead(500, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: `Could not create project: ${(err as Error).message}` }));
          return;
        }
        // N233 — ignore the footprint from the enclosing repo when requested and
        // the chosen parent is a git repo root. The project is already created, so
        // a failed ignore-write is surfaced as a warning, not a hard error.
        if (gitIgnore && existsSync(resolve(realParent, ".git"))) {
          // In-place: the folder IS the repo, so ignore only insight-flow's own
          // footprint — never `.claude/`, which is shared with the user's config.
          // (`.taskflow-activity.jsonl` is already gitignored by initProject.)
          // Subfolder: ignore the whole project subfolder.
          const rules = inPlace ? ["/insightFlow/", "/taskflow.config.json"] : [`/${slug}/`];
          try {
            ignoreProjectFolder(realParent, rules, gitIgnore);
          } catch (err) {
            gitIgnoreWarnings.push(`Could not gitignore the project: ${(err as Error).message}`);
          }
        }
        const { id } = registry.upsert(slug, name, "", { path: dir });
        const entry = registry.getById(id);
        if (entry) broadcast("project-update", registry.toPublicView(entry));
        res.writeHead(200, { "Content-Type": MIME_JSON });
        // N222 review-fix (blocker 1) — the project was created, but surface any
        // requested flow that failed to install (the modal shows the warning)
        // instead of reporting an unqualified success.
        const warnings = [
          ...flowErrors.map((e) => `Flow "${e.id}" did not install: ${e.error}`),
          ...gitIgnoreWarnings,
          ...(conflicts.length
            ? [`Kept your existing files (insight-flow did not overwrite): ${conflicts.join(", ")}`]
            : []),
        ];
        res.end(JSON.stringify({ id, name, path: dir, warnings }));
        return;
      }

      // N214 — GET /api/hub/projects — the registered projects + live status
      // (id, label, url, online, lastSeenAt). Consumed by the switcher (N215).
      if (req.method === "GET" && url.pathname === "/api/hub/projects") {
        // N221 review-fix — same-origin only; ACAO:* would otherwise let any
        // website read the project list (names + activity state).
        if (!isTrustedLocalRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
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
        // N221 review-fix — same-origin only, so a website can't trigger the
        // health-probe sweep / read the returned list.
        if (!isTrustedLocalRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
          return;
        }
        // SSRF guard: only probe loopback dashboards. A registrant-controlled
        // url must never make the master fetch an arbitrary (internal) host.
        const entries = registry.getAll().filter((e) => e.url && isLoopbackUrl(e.url));
        await Promise.all(entries.map((e) => probeProjectHealth(e)));
        for (const e of registry.getAllPublic()) broadcast("project-update", e);
        res.writeHead(200, { "Content-Type": MIME_JSON });
        res.end(JSON.stringify({ projects: registry.getAllPublic() }));
        return;
      }

      // N215 — POST /api/hub/projects/:id/start — spawn an offline project's
      // dashboard (it execs + writes), then wait until reachable. The dashboard
      // registers on boot (reconciling by path), so the entry gets its live url +
      // goes online. Returns { url } for the client to route to. N223 — trusted-host
      // gated: loopback by default, but an allowlisted LAN host (via
      // INSIGHT_FLOW_TRUSTED_HOSTS) may start a stopped project from the PWA on a
      // phone. Accepted trust boundary: a trusted LAN client can spawn a dashboard
      // process on the hub host — documented in N224.
      const startMatch = /^\/api\/hub\/projects\/([^/]+)\/start$/.exec(url.pathname);
      if (req.method === "POST" && startMatch) {
        // N221 review-fix / N223 — start spawns a process; reject DNS-rebound /
        // cross-origin browser POSTs (CSRF). isTrustedActionRequest adds a peer-IP
        // guard: a non-loopback client is only accepted for an explicitly-allowlisted
        // host (env unset ⇒ localhost-only for all clients).
        if (!isTrustedActionRequest(req)) {
          res.writeHead(403, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "request refused" }));
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
        // N240 — guard the SPAWN path only (after the already-running / already-
        // starting early-returns, so a live project whose folder is transiently gone
        // still routes to its running url). A registered project whose folder is gone
        // (e.g. a stale hub.json entry) must not spawn: `spawn` with a missing `cwd`
        // emits an async `error` (ENOENT) the try/catch below CANNOT catch, and an
        // unhandled 'error' event would crash the whole master. Return 404 instead.
        if (!existsSync(entry.path)) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "project path no longer exists" }));
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
            // N240 — spawn failures (bad cwd, EACCES, missing node) surface as an
            // ASYNC 'error' event, NOT a thrown exception — the try/catch can't see
            // them. Without this handler an unhandled 'error' crashes the master.
            // Log + swallow; the 15s registration wait below then times out cleanly.
            child.on("error", (err) => {
              console.error(
                `[master] failed to launch ${entry.label} (${entry.path}): ${(err as Error).message}`,
              );
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

      // N225/N238 — GET /hub-notify.js: the shared notification client, injected
      // into every hub page (overview + proxied projects) so SW-backed
      // notifications fire from anywhere in the hub, backgrounded. N238 — now a
      // real vite-built module (dist/master/hub-notify.js) importing the shared
      // settings/watched-status model, not an inline string blob.
      if (req.method === "GET" && url.pathname === "/hub-notify.js") {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(getHubNotifyJs());
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

      // N231 — GET /assets/<file>: the built master overview bundle (JS/CSS/
      // fonts, hashed + immutable). Flat vite assets dir, path-confined.
      if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
        const rel = url.pathname.slice("/assets/".length);
        if (!rel || rel.includes("..") || rel.includes("/")) {
          res.writeHead(400, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "bad asset" }));
          return;
        }
        const assetPath = resolve(MASTER_ASSETS_DIR, rel);
        if (!assetPath.startsWith(MASTER_ASSETS_DIR + sep) || !existsSync(assetPath)) {
          res.writeHead(404, { "Content-Type": MIME_JSON });
          res.end(JSON.stringify({ error: "not found" }));
          return;
        }
        const ext = assetPath.slice(assetPath.lastIndexOf("."));
        const data = readFileSync(assetPath);
        res.writeHead(200, {
          "Content-Type": MASTER_ASSET_MIME[ext] ?? "application/octet-stream",
          "Content-Length": String(data.length),
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(data);
        return;
      }

      // GET / or /overview — the hub shell / switcher (N215 serves it at the
      // root too, so it's the PWA start_url and the landing page). N231 — this is
      // now the built React island's shell (the app fetches /api/hub/projects and
      // subscribes to /events on mount); assets are served from /assets/* above.
      if (
        req.method === "GET" &&
        (url.pathname === "/overview" || url.pathname === "/" || url.pathname === "/logs")
      ) {
        res.writeHead(200, { "Content-Type": MIME_HTML, "Cache-Control": "no-cache" });
        res.end(getOverviewShell());
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
