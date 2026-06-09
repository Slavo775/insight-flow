import type { Task } from "./lib.js";

export interface ShardResponse {
  tasks?: Task[];
}

export interface MasterResponse {
  meta?: { currentTaskId?: string | null };
}

/** List the shard JSON files, newest range first (e.g. tasks-N80-N89.json). */
export async function fetchShardIndex(): Promise<string[]> {
  const res = await fetch("/api/work-tasks");
  const files: string[] = await res.json();
  return files.filter((f) => f.startsWith("tasks-")).sort((a, b) => b.localeCompare(a));
}

/** Load one shard's tasks (reviews/incidents already hydrated by the server). */
export async function fetchShard(name: string): Promise<Task[]> {
  const res = await fetch("/api/work-tasks/" + encodeURIComponent(name));
  const shard: ShardResponse = await res.json();
  return shard.tasks || [];
}

export async function fetchMaster(): Promise<MasterResponse> {
  const res = await fetch("/api/work-tasks/master.json");
  return res.json();
}

export type DocName = "TASK" | "CHECKLIST" | "REVIEW" | "ANALYSIS";

/**
 * Fetch a task's generated markdown doc. Returns the raw markdown, or null if
 * the file does not exist (e.g. a task with no REVIEW.md yet).
 */
export async function fetchTaskDoc(folder: string, name: DocName): Promise<string | null> {
  const res = await fetch("/api/task-doc?folder=" + encodeURIComponent(folder) + "&name=" + name);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load " + name + ".md (" + res.status + ")");
  return res.text();
}
