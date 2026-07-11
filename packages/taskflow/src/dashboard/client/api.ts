import type { Task, FlowStatus } from "./lib.js";
import { apiFetch } from "./base.js";

export interface ShardResponse {
  tasks?: Task[];
}

export interface MasterResponse {
  meta?: { currentTaskId?: string | null };
}

/** List the shard JSON files, newest range first (e.g. tasks-N80-N89.json). */
export async function fetchShardIndex(): Promise<string[]> {
  const res = await apiFetch("/api/work-tasks");
  const files: string[] = await res.json();
  return files.filter((f) => f.startsWith("tasks-")).sort((a, b) => b.localeCompare(a));
}

/** Load one shard's tasks (reviews/incidents already hydrated by the server). */
export async function fetchShard(name: string): Promise<Task[]> {
  const res = await apiFetch("/api/work-tasks/" + encodeURIComponent(name));
  const shard: ShardResponse = await res.json();
  return shard.tasks || [];
}

export async function fetchMaster(): Promise<MasterResponse> {
  const res = await apiFetch("/api/work-tasks/master.json");
  return res.json();
}

// N93 — composer registry browser ------------------------------------------

/** One registry module; kind-specific fields are optional on the wire. */
export interface ModuleDto {
  id: string;
  title: string;
  description?: string;
  source: "builtin" | "custom";
  /** N106 — harness target (descriptive this round). Absent = both. */
  target?: "claude" | "cursor" | "both";
  kind:
    | "section"
    | "include"
    | "mcp-server"
    | "hook"
    | "skill"
    | "bundle"
    | "status-transition"
    | "handover"
    | "subagent";
  heading?: string;
  body?: string;
  ref?: string;
  name?: string;
  config?: Record<string, unknown>;
  event?: string;
  matcher?: string;
  command?: string;
  timeout?: number;
  script?: { name: string; content: string };
  content?: string;
  /** bundle kind: ids of the contained modules. */
  modules?: string[];
  /** status-transition kind (N128): agent advances the task to `sets` (optionally only `from`). */
  agent?: string;
  sets?: string;
  from?: string;
  /** handover kind (N142): hand to agent `to` (optionally only `on` a status), `mode` auto|gated. */
  to?: string;
  on?: string;
  mode?: "auto" | "gated";
  label?: string;
  /** N189 — optional branch reason rendered into the `## Handover` section. */
  when?: string;
  /** N190 — subagent kind: emitted to `.claude/agents/<name>.md` (Claude + Cursor). */
  tools?: string[];
  model?: string;
  readonly?: boolean;
  background?: boolean;
}

// N103/N106 — writes to the custom-definition CRUD API -----------------------

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  issues?: ApiIssue[];
  referencedBy?: string[];
  constructor(status: number, message: string, issues?: ApiIssue[], referencedBy?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
    this.referencedBy = referencedBy;
  }
}

export type DefinitionKind = "modules" | "agents" | "projects";

/**
 * Normalize a custom-id tail to the filename-safe slug the schema requires
 * (lowercase letters, digits, hyphens). Applied as the user types so the
 * common case ("My Module" → "my-module") never trips the server's stricter
 * id validation; the schema remains the real guarantee for API/JSON authors.
 */
export function slugifyIdTail(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

// N138 — client mirror of core/schema's deriveCommandName: the installed
// command/skill name for an agent (task-<slug>, no double-prefix). Kept here so
// the client bundle doesn't import the zod schema module.
export function deriveCommandName(agentId: string): string {
  const tail = agentId.replace(/^custom:/, "");
  return /^task/.test(tail) ? tail : `task-${tail}`;
}

async function throwApiError(res: Response): Promise<never> {
  let payload: { error?: string; issues?: ApiIssue[]; referencedBy?: string[] } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(
    res.status,
    payload.error ?? `request failed (${res.status})`,
    payload.issues,
    payload.referencedBy,
  );
}

export async function saveDefinition(
  kind: DefinitionKind,
  record: { id: string },
  isUpdate: boolean,
  opts: { revision?: string } = {},
): Promise<void> {
  const path = isUpdate ? `/api/${kind}/${encodeURIComponent(record.id)}` : `/api/${kind}`;
  const res = await apiFetch(path, {
    method: isUpdate ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      // N111 — stale-write guard: echo the revision the record was loaded at.
      ...(opts.revision ? { "x-revision": opts.revision } : {}),
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) await throwApiError(res);
}

export async function deleteDefinition(kind: DefinitionKind, id: string): Promise<void> {
  const res = await apiFetch(`/api/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) await throwApiError(res);
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
  /** N102 — "custom" for user-space agents; absent/builtin for shipped ones. */
  source?: "builtin" | "custom";
  modules: AgentModuleRef[];
  /** N138 — opt-in install of the agent's composed prompt as a command/skill. */
  command?: { install: boolean; as: "command" | "skill" };
  /** N191 — subagent modules this orchestrator fans out to (delegation targets). */
  subagents?: AgentModuleRef[];
}

export async function fetchModules(): Promise<ModulesResponse> {
  const res = await apiFetch("/api/modules");
  if (!res.ok) throw new Error("Failed to load modules (" + res.status + ")");
  return res.json();
}

export interface ProjectDto {
  id: string;
  title: string;
  description?: string;
  /** N108 — "builtin" for the shipped default flow. */
  source?: "builtin" | "custom";
  /** N121 — true when a user-space override shadows the shipped definition. */
  ejected?: boolean;
  agents: string[];
  /** N147 — `handover` marks the relation as a handover (project-scoped, independent of `on`). */
  flow: { from: string; to: string; on?: string; handover?: { mode: "auto" | "gated" } }[];
  install: string[];
  /** N122 — the flow's main/entry agent(s); empty ⇒ not selectable by agent. */
  entryAgents?: string[];
  /** N109 — hand-arranged node positions; absent = auto-layout. */
  layout?: Record<string, { x: number; y: number }>;
  /** N111 — optimistic-concurrency token for custom flows. */
  revision?: string;
  /** N112 — per-flow custom states (display aliases onto canonical statuses). */
  states?: { id: string; title: string; color?: string; mapsTo: string }[];
  /** N128/N155 — the flow's own status set (drives flow-aware trigger pickers). */
  statuses?: FlowStatus[];
  agentTitles: Record<string, string>;
  installModules: { id: string; title: string; kind: string }[];
}

export async function fetchProject(id?: string): Promise<ProjectDto> {
  const res = await apiFetch("/api/project" + (id ? `?id=${encodeURIComponent(id)}` : ""));
  if (!res.ok) throw new Error("Failed to load project (" + res.status + ")");
  return res.json();
}

export interface ProjectSummaryDto {
  id: string;
  title: string;
  description?: string;
  source: "builtin" | "custom";
  agentCount: number;
  flowCount: number;
  /** N122 — the flow's main/entry agent(s); empty ⇒ not selectable by agent. */
  entryAgents?: string[];
  /** N128/N129 — the flow's own status set; drives the kanban columns. */
  statuses?: FlowStatus[];
}

export async function fetchProjects(): Promise<ProjectSummaryDto[]> {
  const res = await apiFetch("/api/projects");
  if (!res.ok) throw new Error("Failed to load projects (" + res.status + ")");
  const data: { projects: ProjectSummaryDto[] } = await res.json();
  return data.projects;
}

// N125/N127 — flow install plan + execution.
export interface InstallStepDto {
  kind: "mcp" | "hook" | "skill" | "command";
  key: string;
  label: string;
  target: string;
}

// N165 — a `${VAR}` input the install must collect.
export interface InputSpecDto {
  name: string;
  title: string;
  description?: string;
  secret: boolean;
  /** N165 — a value is already saved locally; the modal shows "saved" and the
   * user may leave the field blank to reuse it. The value itself is never sent. */
  saved?: boolean;
}

export interface InstallReport {
  target: string;
  action: "created" | "updated" | "unchanged" | "removed";
}

// N165 — a differing config conflict (HTTP 409): the modal renders the diff and
// can retry with force. Secret values are scrubbed server-side.
export interface InstallConflictDto {
  kind: "mcp" | "skill" | "command";
  name: string;
  installed: unknown;
  incoming: unknown;
}

/** Thrown by runInstall when the server returns a 409 structured conflict. */
export class InstallConflictError extends Error {
  conflict: InstallConflictDto;
  constructor(conflict: InstallConflictDto) {
    super(`'${conflict.name}' already exists with a different definition`);
    this.name = "InstallConflictError";
    this.conflict = conflict;
  }
}

// N174 — install/uninstall any target (flow | agent | module). Reuses the
// InstallStep / conflict / report shapes; the only new wire shape is the
// uninstall plan (per-artifact removed-vs-retained).
export type InstallTargetKind = "flow" | "agent" | "module";

export async function fetchInstallPlan(
  kind: InstallTargetKind,
  id: string,
): Promise<{ plan: InstallStepDto[]; requiredInputs: InputSpecDto[] }> {
  const res = await apiFetch(`/api/install-plan?kind=${kind}&id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load install plan (${res.status})`);
  }
  const body = await res.json();
  return {
    plan: body.plan as InstallStepDto[],
    requiredInputs: (body.requiredInputs ?? []) as InputSpecDto[],
  };
}

export async function runInstall(
  kind: InstallTargetKind,
  id: string,
  opts: { values?: Record<string, string>; force?: boolean } = {},
): Promise<InstallReport[]> {
  const res = await apiFetch("/api/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id, values: opts.values, force: opts.force }),
  });
  const body = await res.json();
  if (res.status === 409 && body.conflict) {
    throw new InstallConflictError(body.conflict as InstallConflictDto);
  }
  if (!res.ok) throw new Error(body.error ?? `install failed (${res.status})`);
  return body.reports as InstallReport[];
}

export interface UninstallStepDto {
  kind: "mcp" | "hook" | "skill" | "command";
  key: string;
  label: string;
  target: string;
  /** removed (no other target owns it) or retained (still owned elsewhere). */
  action: "removed" | "retained";
}

export async function fetchUninstallPlan(
  kind: InstallTargetKind,
  id: string,
): Promise<{ plan: UninstallStepDto[] }> {
  const res = await apiFetch(`/api/uninstall-plan?kind=${kind}&id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load uninstall plan (${res.status})`);
  }
  const body = await res.json();
  return { plan: body.plan as UninstallStepDto[] };
}

export async function runUninstall(kind: InstallTargetKind, id: string): Promise<InstallReport[]> {
  const res = await apiFetch("/api/uninstall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `uninstall failed (${res.status})`);
  return body.reports as InstallReport[];
}

/** N117 — reassign a task's flow (ready-only; the server enforces the lock). */
export async function setTaskFlow(id: string, flow: string): Promise<void> {
  const res = await apiFetch("/api/task-flow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, flow }),
  });
  if (!res.ok) {
    let msg = `request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.message ?? body.error ?? msg;
    } catch {
      /* non-JSON */
    }
    throw new Error(msg);
  }
}

/**
 * N172 — undo an install overwrite: restore a `.mcp.json` server entry. The
 * server holds the real prior value (snapshotted before the overwrite); the
 * client only names which server to roll back.
 */
export async function restoreMcpServer(name: string): Promise<void> {
  const res = await apiFetch("/api/mcp-restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
}

/** N167 — make a flow the binding default (new tasks bind to it, no entryAgents needed). */
export async function setDefaultFlow(flowId: string): Promise<void> {
  const res = await apiFetch("/api/default-flow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flowId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
}

/** Markdown content behind an include module's @ref, or null if not present. */
export async function fetchIncludeDoc(ref: string): Promise<string | null> {
  const res = await apiFetch("/api/include-doc?ref=" + encodeURIComponent(ref));
  if (!res.ok) return null;
  return res.text();
}

export async function fetchAgents(): Promise<AgentDto[]> {
  const res = await apiFetch("/api/agents");
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
  const res = await apiFetch(
    "/api/task-doc?folder=" + encodeURIComponent(folder) + "&name=" + name,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load " + name + ".md (" + res.status + ")");
  return res.text();
}
