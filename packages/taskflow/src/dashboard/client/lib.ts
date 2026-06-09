// Local view-model types mirroring the shard JSON the server returns (with
// reviews/incidents hydrated from side files by /api/work-tasks/:shard). Kept
// local so the client bundle stays decoupled from the core/server modules.

export interface StatusHistoryEntry {
  status: string;
  at: string;
  by?: string;
}

export interface Fix {
  startedAt?: string | null;
  endedAt?: string | null;
  status?: string;
  by?: string;
  comment?: string | null;
  filesChanged?: string[];
}

export interface Review {
  startedAt?: string;
  endedAt?: string | null;
  verdict?: string | null;
  comment?: string | null;
  type?: string;
  by?: string;
  fix?: Fix | null;
}

export interface Incident {
  id: string;
  title: string;
  severity?: string;
  status: string;
  reportedAt?: string;
  resolvedAt?: string | null;
  branch?: string | null;
  description?: string | null;
  rootCause?: string | null;
  fix?: string | null;
}

export interface Push {
  at?: string;
  commitHash?: string;
  commitMessage?: string;
}

export interface Implementation {
  startedAt?: string | null;
  completedAt?: string | null;
  filesChanged?: string[];
  tokensUsed?: number | null;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  folder?: string;
  branch?: string | null;
  mrUrl?: string | null;
  tags?: string[];
  createdAt: string;
  statusHistory?: StatusHistoryEntry[];
  implementation?: Implementation;
  reviews?: Review[];
  incidents?: Incident[];
  pushes?: Push[];
}

export interface Column {
  key: string;
  label: string;
  matches: string[];
}

export const COLUMNS: Column[] = [
  { key: "ready", label: "Ready", matches: ["ready"] },
  {
    key: "progress",
    label: "In Progress",
    matches: ["in-progress", "implemented", "changes-implementing", "changes-implemented"],
  },
  { key: "review", label: "Review", matches: ["reviewing"] },
  {
    key: "fix",
    label: "Fix",
    matches: ["fix-needed", "fixing", "fixed", "changes-requested", "request-changes"],
  },
  { key: "approved", label: "Approved", matches: ["approved", "pushed"] },
  { key: "merged", label: "Done", matches: ["merged", "done"] },
];

export function badgeClass(status: string): string {
  if (["ready"].includes(status)) return "badge-ready";
  if (
    ["in-progress", "implemented", "changes-implementing", "changes-implemented"].includes(status)
  )
    return "badge-progress";
  if (["reviewing"].includes(status)) return "badge-review";
  if (["fix-needed", "fixing", "fixed", "changes-requested", "request-changes"].includes(status))
    return "badge-fix";
  if (["approved", "pushed"].includes(status)) return "badge-approved";
  if (["merged", "done"].includes(status)) return "badge-merged";
  return "badge-pushed";
}

const STATUS_COLORS: Record<string, string> = {
  ready: "#94a3b8",
  "in-progress": "#f59e0b",
  implemented: "#06b6d4",
  reviewing: "#a855f7",
  approved: "#22c55e",
  "fix-needed": "#ef4444",
  fixing: "#dc2626",
  fixed: "#22c55e",
  pushed: "#16a34a",
  merged: "#10b981",
  "changes-requested": "#f97316",
  "changes-implementing": "#fb923c",
  "changes-implemented": "#14b8a6",
};

export function taskStatusColor(status: string): string {
  return STATUS_COLORS[status] || "#737373";
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SEVERITY_CLASS: Record<string, string> = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
};
