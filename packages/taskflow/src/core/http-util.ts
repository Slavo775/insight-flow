import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";

/**
 * N254 — shared HTTP helpers for the two Node servers (dashboard + master),
 * which previously hand-rolled the same JSON-response, body-read, MIME, static-
 * serve, and HTML-escape logic independently. `core` depends on nothing else in
 * `src`, so both servers can import from here without a cross-module edge.
 */

/** Superset of both servers' content-type tables (dashboard + master assets). */
export const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export const MIME_JSON = MIME[".json"];
export const MIME_HTML = MIME[".html"];

/** Default request-body cap: 256KB. Oversized bodies get a 413 (see readBody). */
export const DEFAULT_BODY_LIMIT = 256 * 1024;

/** Write a JSON response in one call: `writeHead(status, json) + end(stringify)`. */
export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": MIME_JSON });
  res.end(JSON.stringify(payload));
}

/**
 * Read the full request body as a string, capped at `limit` bytes. On overflow
 * the request is destroyed, a 413 JSON error is sent, and the promise resolves
 * `null` — callers MUST `return` when they get `null`. Also resolves `null` on a
 * stream error. Never rejects.
 */
export function readBody(
  req: IncomingMessage,
  res: ServerResponse,
  limit: number = DEFAULT_BODY_LIMIT,
): Promise<string | null> {
  return new Promise((resolve) => {
    let body = "";
    let done = false;
    const finish = (value: string | null): void => {
      if (done) return;
      done = true;
      resolve(value);
    };
    req.on("data", (chunk: Buffer) => {
      if (done) return;
      body += chunk.toString("utf-8");
      if (body.length > limit) {
        sendJson(res, 413, { ok: false, error: "payload too large" });
        req.destroy();
        finish(null);
      }
    });
    req.on("end", () => finish(body));
    req.on("error", () => finish(null));
  });
}

/** Escape the five HTML-significant chars (superset of both servers' escapers). */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * N272 — shared localhost trust gate for BOTH Node servers (dashboard + master),
 * moved here from `master/server.ts` so the dashboard applies the identical
 * check. Threat model: a website in the user's browser, or a LAN peer, hitting a
 * localhost port. See `isTrustedLocalRequest` / `isTrustedActionRequest`.
 */

/** `Host`-header hostnames that are the local machine (client-forgeable). */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Socket peer addresses that are the local machine (NOT forgeable over the
 *  network — `req.socket.remoteAddress` is the real TCP peer). */
const LOOPBACK_PEERS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** True if the host is loopback. */
export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}

/** True if a full URL's host is loopback (SSRF / open-proxy guard). */
export function isLoopbackUrl(u: string): boolean {
  try {
    return isLoopbackHost(new URL(u).hostname);
  } catch {
    return false;
  }
}

/** The hostname of a `Host` (host:port) or `Origin` (scheme://host:port) header
 *  value, or "" if unparseable. WHATWG URL returns `[::1]` (with brackets) for
 *  an IPv6 host, which is why `[::1]` is in `LOOPBACK_HOSTS`. */
export function headerHost(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value.includes("://") ? value : "http://" + value).hostname;
  } catch {
    return "";
  }
}

/**
 * Extra hosts the user explicitly allowlisted (their LAN IP / hostname) via
 * `INSIGHT_FLOW_TRUSTED_HOSTS` (comma-separated bare host or `host:port`), so the
 * installable PWA works over the LAN / on mobile (N223). Parsed per request
 * (cheap; gated endpoints are user-frequency) so it stays honest under tests
 * that set/restore the env. Empty/unset ⇒ localhost-only.
 */
export function trustedHostSet(): Set<string> {
  const set = new Set<string>();
  const raw = process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  if (!raw) return set;
  for (const part of raw.split(",")) {
    const h = headerHost(part.trim());
    if (h) set.add(h);
  }
  return set;
}

/** True if the host is loopback OR an explicitly-allowlisted trusted host. */
export function isTrustedHost(hostname: string, trusted: Set<string>): boolean {
  return isLoopbackHost(hostname) || trusted.has(hostname);
}

/** N272 — the real TCP peer is the local machine (cannot be spoofed over the
 *  network). Used to decide whether to trust an `X-Forwarded-Host` the hub proxy
 *  set: only a loopback peer (the hub runs on the same machine) may override the
 *  effective host. */
export function isLoopbackPeer(req: IncomingMessage): boolean {
  return LOOPBACK_PEERS.has(req.socket.remoteAddress ?? "");
}

/** N272 — the `Host` of the request is loopback or allowlisted. The weakest
 *  gate: it defeats DNS rebinding (the browser sends the attacker's hostname in
 *  `Host`, not the loopback it resolved to) and applies to EVERY request incl.
 *  GET. A failure should answer `421 Misdirected Request`. */
export function isHostTrusted(req: IncomingMessage): boolean {
  return isTrustedHost(headerHost(req.headers.host), trustedHostSet());
}

/**
 * Is this a trusted same-origin request to a sensitive local endpoint? Binding
 * loopback is not enough on its own against a browser, so a request is trusted
 * only if: its `Host` is loopback/allowlisted (defeats DNS rebinding); it
 * carries no cross-origin `Origin` (a cross-origin fetch sends one whose host is
 * not loopback/allowlisted — defeats CSRF); and its `Sec-Fetch-Site`, if
 * present, is `same-origin`/`none`. The app's own same-origin page passes.
 */
export function isTrustedLocalRequest(req: IncomingMessage): boolean {
  const trusted = trustedHostSet();
  if (!isTrustedHost(headerHost(req.headers.host), trusted)) return false;
  const origin = req.headers.origin;
  if (origin && !isTrustedHost(headerHost(origin), trusted)) return false;
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}

/**
 * The gate for write/exec endpoints. `isTrustedLocalRequest` is header-only, so
 * a non-browser LAN client (curl) could forge `Host: 127.0.0.1` and pass it;
 * this adds a peer-IP defense-in-depth: the header checks must pass, a loopback
 * socket peer is always allowed, and a non-loopback peer is allowed ONLY when
 * the request targets a host the user explicitly allowlisted (the loopback
 * shortcut does NOT count here). Env unset ⇒ every non-loopback peer rejected.
 */
export function isTrustedActionRequest(req: IncomingMessage): boolean {
  if (!isTrustedLocalRequest(req)) return false;
  const remote = req.socket.remoteAddress ?? "";
  if (LOOPBACK_PEERS.has(remote)) return true;
  return trustedHostSet().has(headerHost(req.headers.host));
}

/** N272 — the host both servers bind to. Loopback-only by default; all
 *  interfaces only when the user opted into LAN access via
 *  `INSIGHT_FLOW_TRUSTED_HOSTS`. `undefined` ⇒ Node's default (all interfaces). */
export function listenHost(): string | undefined {
  return process.env.INSIGHT_FLOW_TRUSTED_HOSTS ? undefined : "127.0.0.1";
}

/**
 * Serve a file already confirmed safe by the CALLER (each server keeps its own
 * traversal guard — dashboard uses a prefix check, master uses realpath — so
 * this only does the shared read + MIME + headers). 404s on read failure.
 */
export function serveStaticFile(res: ServerResponse, absPath: string, cacheControl?: string): void {
  try {
    const data = readFileSync(absPath);
    const ext = absPath.slice(absPath.lastIndexOf("."));
    const headers: Record<string, string> = {
      "Content-Type": MIME[ext] || "application/octet-stream",
    };
    if (cacheControl) headers["Cache-Control"] = cacheControl;
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}
