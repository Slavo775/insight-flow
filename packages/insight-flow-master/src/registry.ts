import { randomUUID } from "node:crypto";
import type { ClaudeProjectStatus, MasterProjectEntry, MasterProjectState } from "./types.js";

const registry = new Map<string, MasterProjectEntry>();
const projectIdIndex = new Map<string, string>(); // projectId → current UUID

export function upsert(projectId: string, label: string, url: string): string {
  const now = new Date().toISOString();

  const existing = projectIdIndex.has(projectId)
    ? registry.get(projectIdIndex.get(projectId)!)
    : undefined;

  if (existing) {
    existing.label = label;
    existing.url = url;
    existing.lastSeenAt = now;
    return existing.id;
  }

  const newId = randomUUID();
  registry.set(newId, {
    id: newId,
    projectId,
    label,
    url,
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
  return newId;
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
