/**
 * N215 — base-path awareness so the same Vite build (base "/") works both
 * standalone at `/` and reverse-proxied under `/p/<id>/` (the N212 hub proxy).
 *
 * The master injects `window.__IF_BASE__ = "/p/<id>/"` into the proxied shell
 * (N212). We read it once and prefix every same-origin API / SSE URL with it,
 * so the client's absolute `/api/…` and `/sse` paths resolve back through the
 * proxy instead of hitting the master root. Standalone → BASE is "" (no change).
 */
const rawBase =
  (typeof window !== "undefined" && (window as unknown as { __IF_BASE__?: string }).__IF_BASE__) ||
  "/";

/** "" when standalone; "/p/<id>" (no trailing slash) when proxied. */
export const BASE = rawBase === "/" ? "" : rawBase.replace(/\/+$/, "");

/** Prefix an absolute app path (leading slash) with the runtime base. */
export function apiUrl(path: string): string {
  return BASE + path;
}

/** fetch() against a base-aware URL — a drop-in for `fetch(path, init)`. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
