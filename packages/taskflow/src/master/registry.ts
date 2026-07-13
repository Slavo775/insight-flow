import { randomUUID } from "node:crypto";
import type {
  ClaudeProjectStatus,
  MasterProjectEntry,
  MasterProjectState,
  PublicProjectEntry,
} from "./types.js";

const registry = new Map<string, MasterProjectEntry>();
const projectIdIndex = new Map<string, string>(); // projectId → current UUID

function findByPath(path: string): MasterProjectEntry | undefined {
  if (!path) return undefined;
  for (const e of registry.values()) if (e.path === path) return e;
  return undefined;
}

/**
 * Register (or reconcile) a project. Returns its stable `id` and per-project
 * `token`. Reconciliation order: by `projectId`, then by `path` (N214 — lets a
 * live dashboard adopt a seeded/bulk-ui entry whose label ≠ projectName). A new
 * entry gets a fresh token and starts offline; an existing one keeps its token.
 */
export function upsert(
  projectId: string,
  label: string,
  url: string,
  opts: { path?: string } = {},
): { id: string; token: string } {
  const now = new Date().toISOString();

  const existing =
    (projectIdIndex.has(projectId) ? registry.get(projectIdIndex.get(projectId)!) : undefined) ??
    (opts.path ? findByPath(opts.path) : undefined);

  if (existing) {
    // Re-key if we matched by path under a different projectId.
    if (existing.projectId !== projectId) {
      projectIdIndex.delete(existing.projectId);
      existing.projectId = projectId;
    }
    existing.label = label;
    if (url) existing.url = url;
    if (opts.path) existing.path = opts.path;
    existing.lastSeenAt = now;
    projectIdIndex.set(projectId, existing.id);
    return { id: existing.id, token: existing.token };
  }

  const newId = randomUUID();
  const token = randomUUID();
  registry.set(newId, {
    id: newId,
    projectId,
    label,
    url,
    path: opts.path,
    token,
    online: false,
    registeredAt: now,
    lastSeenAt: now,
    state: {
      currentTaskId: null,
      currentTaskTitle: null,
      currentTaskStatus: null,
      taskCounts: {},
      recentActivity: [],
    },
  });
  projectIdIndex.set(projectId, newId);
  return { id: newId, token };
}

/**
 * N213/N214 — seed a persisted hub project as a known-but-offline entry (empty
 * url), so the overview lists it before its dashboard starts. When the dashboard
 * later registers (by matching `projectId` or `path`), `upsert` reconciles onto
 * this entry and fills in the live url. No-op if the project is already known.
 */
export function seed(projectId: string, label: string, path?: string): void {
  if (projectIdIndex.has(projectId)) return;
  if (path && findByPath(path)) return;
  upsert(projectId, label, "", { path });
}

/**
 * N219 — the client-safe projection of an entry: drops the auth `token` and the
 * server-only `url`/`path`, keeping just what the browser needs to render + link.
 */
export function toPublicView(entry: MasterProjectEntry): PublicProjectEntry {
  return {
    id: entry.id,
    projectId: entry.projectId,
    label: entry.label,
    online: entry.online,
    lastSeenAt: entry.lastSeenAt,
    state: entry.state,
  };
}

/** N219 — every registered project as a client-safe view (no tokens). */
export function getAllPublic(): PublicProjectEntry[] {
  return [...registry.values()].map(toPublicView);
}

/** N214 — the token issued at register must match on update/status/live. */
export function verifyToken(id: string, token: string | undefined): boolean {
  const entry = registry.get(id);
  return !!entry && !!token && entry.token === token;
}

/** N214 — set liveness (connection open/close, or probe result) + refresh seen. */
export function setOnline(id: string, online: boolean): boolean {
  const entry = registry.get(id);
  if (!entry) return false;
  entry.online = online;
  entry.lastSeenAt = new Date().toISOString();
  return true;
}

export function update(id: string, state: MasterProjectState): boolean {
  const entry = registry.get(id);
  if (!entry) return false;
  entry.lastSeenAt = new Date().toISOString();
  entry.state = { claudeStatus: entry.state.claudeStatus, ...state };
  return true;
}

// N68 round-4 fix: accept the four-state vocabulary alongside the legacy
// three-state names so the project server can push `done` /
// `awaiting-permission` without hitting a 400. Existing callers using `idle`
// / `permission-required` continue to work unchanged.
const VALID_STATUSES = new Set<ClaudeProjectStatus>([
  "active",
  "idle",
  "permission-required",
  "done",
  "awaiting-permission",
]);

export function updateStatus(id: string, status: string): boolean {
  if (!VALID_STATUSES.has(status as ClaudeProjectStatus)) return false;
  const entry = registry.get(id);
  if (!entry) return false;
  entry.lastSeenAt = new Date().toISOString();
  entry.state.claudeStatus = status as ClaudeProjectStatus;
  return true;
}

export function getAll(): MasterProjectEntry[] {
  return [...registry.values()];
}

export function getById(id: string): MasterProjectEntry | undefined {
  return registry.get(id);
}

/**
 * N220 — resolve by `projectId` through the authoritative `projectIdIndex`
 * rather than a `getAll().find(...)` scan, so a stale/duplicate entry that
 * happens to share a `projectId` can't shadow the live one.
 */
export function getByProjectId(projectId: string): MasterProjectEntry | undefined {
  const id = projectIdIndex.get(projectId);
  return id ? registry.get(id) : undefined;
}
