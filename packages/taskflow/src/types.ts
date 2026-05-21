export type TaskStatus =
  | "ready"
  | "in-progress"
  | "implemented"
  | "reviewing"
  | "approved"
  | "fix-needed"
  | "fixing"
  | "fixed"
  | "pushed"
  | "merged"
  | "done"
  | "request-changes"
  | "changes-requested"
  | "changes-implementing"
  | "changes-implemented";

export interface StatusHistoryEntry {
  status: string;
  at: string;
  by: string;
}

export interface ReviewFix {
  startedAt: string | null;
  endedAt: string | null;
  status: string;
  filesChanged: string[];
  comment: string | null;
  by: string;
}

export interface Review {
  startedAt: string;
  endedAt: string | null;
  verdict: string | null;
  comment: string | null;
  type: "ai" | "human";
  by: string;
  fix: ReviewFix | null;
}

export interface Push {
  at: string;
  commitHash: string;
  commitMessage: string;
}

export interface IncidentStatusEntry {
  status: string;
  at: string;
  by?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
  branch: string;
  description: string | null;
  rootCause: string | null;
  fix: string | null;
  statusHistory: IncidentStatusEntry[];
}

export interface ChangeRequest {
  requestedAt: string;
  description: string;
  requestedBy: string;
  status: string;
  implementedAt: string | null;
  filesChanged: string[];
  comment: string | null;
  implementedBy: string | null;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  folder: string;
  createdAt: string;
  statusHistory: StatusHistoryEntry[];
  implementation: {
    startedAt: string | null;
    completedAt: string | null;
    filesChanged: string[];
    tokensUsed: number | null;
  };
  reviews: Review[];
  changesAfterImplementation: ChangeRequest[];
  incidents: Incident[];
  committedAt: string | null;
  totalDurationMinutes: number | null;
  tags: string[];
  pushes: Push[];
  branch: string | null;
  mrUrl: string | null;
  mergedAt: string | null;
}

export interface ShardFile {
  range: { from: number; to: number };
  tasks: Task[];
}

export interface MasterFile {
  meta: {
    nextId: number;
    currentTaskId: string | null;
    nextIncidentId: number;
    shards: string[];
  };
}

export interface ActivityEvent {
  ts: string;
  tool: string;
  action: string;
  file?: string;
  taskId?: string;
  duration?: number;
  status?: string;
  session?: string;
}

export interface ActivityEngineConfig {
  enabled: boolean;
  logFile: string;
  maxEvents: number;
}

export interface AgentExtensions {
  [agentName: string]: string[];
}

export interface CustomAgent {
  name: string;
  role: string;
  description: string;
  outputContract?: string;
}

export interface AgentsConfig {
  extend?: AgentExtensions;
  custom?: CustomAgent[];
}

export interface TaskflowConfig {
  workDir: string;
  shardSize: number;
  projectName: string;
  rolesDir: string;
  server: {
    port: number;
  };
  activityEngine?: ActivityEngineConfig;
  agents?: AgentsConfig;
}

export interface ParsedArgs {
  _: string[];
  [key: string]: string | boolean | string[];
}
