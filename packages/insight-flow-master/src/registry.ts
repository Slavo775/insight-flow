import { randomUUID } from "node:crypto";
import type { MasterProjectEntry, MasterProjectState } from "./types.js";

const registry = new Map<string, MasterProjectEntry>();

export function register(label: string, url: string): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  registry.set(id, {
    id,
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
  return id;
}

export function update(id: string, state: MasterProjectState): boolean {
  const entry = registry.get(id);
  if (!entry) return false;
  entry.lastSeenAt = new Date().toISOString();
  entry.state = state;
  return true;
}

export function getAll(): MasterProjectEntry[] {
  return [...registry.values()];
}

export function getById(id: string): MasterProjectEntry | undefined {
  return registry.get(id);
}
