import { randomUUID } from "node:crypto";
import type { MasterProjectEntry, MasterProjectState } from "./types.js";

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

export function register(label: string, url: string): string {
  return upsert(label, label, url);
}

export function update(id: string, state: MasterProjectState): boolean {
  const entry = registry.get(id);
  if (!entry) return false;
  entry.lastSeenAt = new Date().toISOString();
  entry.state = { claudeStatus: entry.state.claudeStatus, ...state };
  return true;
}

const VALID_STATUSES = new Set(["active", "idle", "permission-required"]);

export function updateStatus(id: string, status: string): boolean {
  if (!VALID_STATUSES.has(status)) return false;
  const entry = registry.get(id);
  if (!entry) return false;
  entry.lastSeenAt = new Date().toISOString();
  entry.state.claudeStatus = status as "active" | "idle" | "permission-required";
  return true;
}

export function getAll(): MasterProjectEntry[] {
  return [...registry.values()];
}

export function getById(id: string): MasterProjectEntry | undefined {
  return registry.get(id);
}
