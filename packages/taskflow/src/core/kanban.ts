// N129 — kanban columns derived from flows' status sets. Pure + zod-free so
// both the dashboard client and the test harness (dist barrel) share one
// source of truth. Canonical statuses keep today's 6-column grouping, so a
// default-only workspace renders byte-identically; each NON-canonical custom
// status (N128) becomes its own column.

export interface FlowStatus {
  id: string;
  title: string;
  color?: string;
  terminal?: boolean;
}

export interface Column {
  key: string;
  label: string;
  /** Status ids that land in this column. */
  matches: string[];
}

// The canonical 6-column board (pre-N129 hardcoded `COLUMNS`). Every canonical
// status maps into exactly one of these, preserving today's layout verbatim.
export const CANONICAL_COLUMNS: Column[] = [
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

const CANONICAL_STATUS_IDS = new Set(CANONICAL_COLUMNS.flatMap((c) => c.matches));

/**
 * Derive the board's columns from the flows' status sets. Canonical statuses
 * keep the 6-column grouping above; each non-canonical custom status becomes
 * its own column, appended in flow + declaration order and deduped across
 * flows. A default-only workspace yields exactly `CANONICAL_COLUMNS`.
 */
export function buildColumns(flows: { statuses?: FlowStatus[] }[]): Column[] {
  const columns = CANONICAL_COLUMNS.map((c) => ({ ...c, matches: [...c.matches] }));
  const claimed = new Set(CANONICAL_STATUS_IDS);
  for (const flow of flows) {
    for (const status of flow.statuses ?? []) {
      if (claimed.has(status.id)) continue;
      claimed.add(status.id);
      columns.push({ key: status.id, label: status.title, matches: [status.id] });
    }
  }
  return columns;
}

/**
 * Task statuses matched by no column — orphans the board collects into a
 * trailing "Other" column. Order-preserving and deduped; empty for a
 * default-only workspace (every canonical status has a home).
 */
export function orphanStatuses(statuses: string[], columns: Column[]): string[] {
  const matched = new Set(columns.flatMap((c) => c.matches));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of statuses) {
    if (matched.has(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
