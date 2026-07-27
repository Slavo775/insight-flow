// Local view-model types mirroring the shard JSON the server returns (with
// reviews/incidents hydrated from side files by /api/work-tasks/:shard). Kept
// local so the client bundle stays decoupled from the core/server modules.
import { tokens } from "./theme.js";
import type { Column } from "../../core/kanban.js";

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
  /** N116 — the project flow that governs this task ("default" or "custom:<slug>"). */
  flowId?: string;
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

// N129 — the kanban columns now derive from the flows' status sets. The pure
// builder + canonical 6-column grouping live in core/kanban (shared with the
// test harness); re-exported here so existing client imports keep working.
// `COLUMNS` is the canonical default (a default-only board, and the fallback
// while flow statuses load).
export type { Column, FlowStatus } from "../../core/kanban.js";
export {
  buildColumns,
  orphanStatuses,
  isCanonicalStatus,
  statusLabel,
  statusColor,
  CANONICAL_COLUMNS as COLUMNS,
} from "../../core/kanban.js";

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

export function taskStatusColor(status: string): string {
  return tokens.status[status] || tokens.color.textMuted;
}

// N260 — a Kanban column's representative color: the color of its first matching
// status (e.g. the "Review" column → `reviewing` → purple). Used by the colored
// column headers AND the ticket-card left border. Unknown/orphan → muted.
export function statusHeaderColor(col: Column): string {
  return taskStatusColor(col.matches[0] ?? "");
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

/** Whole minutes between two ISO timestamps (N255 — was inlined twice in DetailPanel). */
export function minutesBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}
