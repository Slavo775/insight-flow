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
