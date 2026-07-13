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

/**
 * N228 — default time budget for any same-origin fetch. A healthy server answers
 * in ~1ms; a wedged server or dead hub proxy would otherwise hang the request
 * forever, leaving the UI on a permanent "Loading…" spinner. Generous enough to
 * never trip a legitimately-working request. Callers may override via `timeoutMs`
 * (pass 0 to disable, e.g. for a long-running operation).
 */
const DEFAULT_FETCH_TIMEOUT_MS = 20_000;

/** fetch() against a base-aware URL — a drop-in for `fetch(path, init)`, with a
 * default timeout so a stalled upstream aborts instead of hanging indefinitely. */
export function apiFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = init ?? {};
  if (timeoutMs <= 0 || typeof AbortController === "undefined") {
    return fetch(apiUrl(path), rest);
  }
  const ctrl = new AbortController();
  // Honor a caller-supplied signal too: if it aborts, ours does as well.
  if (rest.signal) rest.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(apiUrl(path), { ...rest, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
