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

// N93 — composer registry browser ------------------------------------------

/** One registry module; kind-specific fields are optional on the wire. */
export interface ModuleDto {
  id: string;
  title: string;
  description?: string;
  source: "builtin" | "custom";
  kind: "section" | "include" | "mcp-server" | "hook" | "skill" | "bundle";
  heading?: string;
  body?: string;
  ref?: string;
  name?: string;
  config?: Record<string, unknown>;
  event?: string;
  matcher?: string;
  command?: string;
  content?: string;
  /** bundle kind: ids of the contained modules. */
  modules?: string[];
}

export interface ModulesResponse {
  modules: ModuleDto[];
  /** moduleId → ids of composed agents that reference it. */
  referencedBy: Record<string, string[]>;
}

export interface AgentModuleRef {
  id: string;
  title: string;
  kind: string;
  description?: string;
}

export interface AgentDto {
  id: string;
  title: string;
  description?: string;
  modules: AgentModuleRef[];
}

export async function fetchModules(): Promise<ModulesResponse> {
  const res = await fetch("/api/modules");
  if (!res.ok) throw new Error("Failed to load modules (" + res.status + ")");
  return res.json();
}

export interface ProjectDto {
  id: string;
  title: string;
  description?: string;
  agents: string[];
  flow: { from: string; to: string; on?: string }[];
  install: string[];
  agentTitles: Record<string, string>;
  installModules: { id: string; title: string; kind: string }[];
}

export async function fetchProject(): Promise<ProjectDto> {
  const res = await fetch("/api/project");
  if (!res.ok) throw new Error("Failed to load project (" + res.status + ")");
  return res.json();
}

/** Markdown content behind an include module's @ref, or null if not present. */
export async function fetchIncludeDoc(ref: string): Promise<string | null> {
  const res = await fetch("/api/include-doc?ref=" + encodeURIComponent(ref));
  if (!res.ok) return null;
  return res.text();
}

export async function fetchAgents(): Promise<AgentDto[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) throw new Error("Failed to load agents (" + res.status + ")");
  const data: { agents: AgentDto[] } = await res.json();
  return data.agents;
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
