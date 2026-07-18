import type { PublicProjectEntry } from "../types.js";

// N231 — the master overview's HTTP calls. All routes are the existing master
// server endpoints (no backend changes): GET /api/hub/projects (initial list),
// POST /api/hub/refresh (on-demand healthcheck), POST /api/hub/projects/:id/start,
// GET /api/fs/list (folder browser), POST /api/projects/create.

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchProjects(): Promise<PublicProjectEntry[]> {
  const res = await fetch("/api/hub/projects");
  const d = await json<{ projects?: PublicProjectEntry[] }>(res);
  return d.projects ?? [];
}

// N244 — debug logs (N242 engine).
export interface VersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
}

// N251 — version + update-available signal for the hub toast. Never throws to
// the caller's UI path; a failed/absent check simply yields no toast.
export async function fetchVersion(): Promise<VersionInfo> {
  const res = await fetch("/api/version");
  return json<VersionInfo>(res);
}

export interface LogEntry {
  type: "error" | "warning" | "info";
  message: string;
  data?: unknown;
  timestamp: string;
  projectName: string;
}
export interface LogCounts {
  error: number;
  warning: number;
  info: number;
}
export interface LogsResult {
  total: number;
  page: number;
  pageSize: number;
  // N248 — real per-level totals across all logs (for the level chips).
  counts: LogCounts;
  logs: LogEntry[];
}
export async function fetchLogs(params: {
  project: string;
  type: string;
  page: number;
  pageSize: number;
  search?: string;
}): Promise<LogsResult> {
  const qs = new URLSearchParams();
  if (params.project) qs.set("project", params.project);
  if (params.type && params.type !== "all") qs.set("type", params.type);
  if (params.search && params.search.trim()) qs.set("search", params.search.trim());
  qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize));
  const res = await fetch(`/api/logs?${qs.toString()}`);
  return json<LogsResult>(res);
}

export async function refreshProjects(): Promise<PublicProjectEntry[]> {
  const res = await fetch("/api/hub/refresh", { method: "POST" });
  const d = await json<{ projects?: PublicProjectEntry[] }>(res);
  return d.projects ?? [];
}

export interface StartResult {
  url?: string;
  starting?: boolean;
  error?: string;
}

export async function startProject(id: string): Promise<StartResult> {
  const res = await fetch(`/api/hub/projects/${encodeURIComponent(id)}/start`, {
    method: "POST",
  });
  return json<StartResult>(res);
}

export interface FsEntry {
  name: string;
}

export interface FsListResult {
  dir: string;
  parent?: string | null;
  entries?: FsEntry[];
  // N233 — true when this folder is itself a git repo root; drives the
  // New-project modal's gitignore options.
  hasGit?: boolean;
  error?: string;
}

export async function listFolders(dir: string | null): Promise<FsListResult> {
  const qs = dir ? `?dir=${encodeURIComponent(dir)}` : "";
  const res = await fetch(`/api/fs/list${qs}`);
  return json<FsListResult>(res);
}

export interface CreateProjectBody {
  name: string;
  dir: string;
  lifecycle: boolean;
  activity: boolean;
  registerHub: boolean;
  editor: string;
  installFlows: string[];
  // N236 — init in the selected folder ("in-folder", default) or in a new
  // subfolder named by `name` ("subfolder").
  location?: "in-folder" | "subfolder";
  // N233 — how to gitignore the project footprint; omitted when the chosen
  // folder is not a git repo root (no options shown).
  gitIgnore?: "shared" | "local";
}

export interface CreateProjectResult {
  error?: string;
  path?: string;
  warnings?: string[];
}

export async function createProject(body: CreateProjectBody): Promise<CreateProjectResult> {
  const res = await fetch("/api/projects/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<CreateProjectResult>(res);
}
