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
