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
  | "merged";

export interface StatusHistoryEntry {
  status: TaskStatus;
  at: string;
  by: string;
}

export interface ReviewFix {
  startedAt: string | null;
  endedAt: string | null;
  status: string;
  filesChanged: string[];
  comment: string;
  by: string;
}

export interface Review {
  startedAt: string;
  endedAt: string | null;
  verdict: "approved" | "fix-needed" | string;
  comment: string;
  type?: "ai" | "human";
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
  severity: "critical" | "high" | "medium" | "low" | string;
  status:
    | "reported"
    | "investigating"
    | "production-fix"
    | "fixed"
    | "verified"
    | "closed"
    | string;
  reportedAt: string;
  resolvedAt?: string | null;
  branch?: string;
  description?: string;
  rootCause?: string | null;
  fix?: string | null;
  statusHistory?: IncidentStatusEntry[];
}

export interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: TaskStatus | string;
  folder?: string;
  createdAt: string;
  statusHistory: StatusHistoryEntry[];
  implementation: {
    startedAt: string | null;
    completedAt: string | null;
    filesChanged: string[];
    tokensUsed: number | null;
  };
  reviews: Review[];
  committedAt: string | null;
  totalDurationMinutes: number | null;
  tags: string[];
  pushes?: Push[];
  branch?: string;
  mrUrl?: string;
  mergedAt?: string | null;
  incidents?: Incident[];
}

export interface ShardFile {
  range?: { from: number; to: number };
  tasks: Task[];
}

export interface MasterFile {
  meta: {
    nextId: number;
    currentTaskId?: string;
    nextIncidentId?: number;
    shards: string[];
  };
}

export interface TaskDataset {
  meta?: {
    nextId: number;
    currentTaskId?: string;
    nextIncidentId?: number;
    shards?: string[];
  };
  tasks: Task[];
}

export const STATUS_COLORS: Record<string, string> = {
  ready: "var(--color-status-ready)",
  "in-progress": "var(--color-status-progress)",
  implemented: "var(--color-status-progress)",
  reviewing: "var(--color-status-review)",
  approved: "var(--color-status-approved)",
  "fix-needed": "var(--color-status-fix)",
  fixing: "var(--color-status-fix)",
  fixed: "var(--color-status-approved)",
  pushed: "var(--color-status-pushed)",
  merged: "var(--color-status-merged)",
};

export const KANBAN_COLUMNS: { key: string; label: string; matches: string[] }[] = [
  { key: "ready", label: "Ready", matches: ["ready"] },
  { key: "progress", label: "In Progress", matches: ["in-progress", "implemented"] },
  { key: "review", label: "Review", matches: ["reviewing"] },
  { key: "fix", label: "Fix", matches: ["fix-needed", "fixing", "fixed"] },
  { key: "approved", label: "Approved", matches: ["approved", "pushed"] },
  { key: "merged", label: "Merged", matches: ["merged"] },
];
