export interface MasterServerConfig {
  port?: number;
  standalone?: boolean;
  /**
   * N251 — the hub's npm update check. When `enabled` is false the master never
   * calls the npm registry and `/api/version` returns `latest: null` (no toast).
   * `intervalHours` throttles the registry lookup (cached in-process).
   */
  updateCheck?: { enabled?: boolean; intervalHours?: number };
}

/**
 * Claude project status vocabulary.
 * - `active` / `idle` / `permission-required` — legacy three-state pushed by
 *   the activity-engine on pre-N68 project servers.
 * - `done` / `awaiting-permission` — N68 four-state pushed via
 *   `/log/events` derivation. Master accepts both vocabularies so projects
 *   can upgrade independently of each other.
 */
export type ClaudeProjectStatus =
  | "active"
  | "idle"
  | "permission-required"
  | "done"
  | "awaiting-permission";

export interface MasterProjectState {
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  currentTaskStatus: string | null;
  taskCounts: Record<string, number>;
  recentActivity: object[];
  claudeStatus?: ClaudeProjectStatus;
}

export interface MasterProjectEntry {
  id: string;
  projectId: string;
  label: string;
  url: string;
  /** Absolute project dir, when known — lets the hub reconcile by path (N214). */
  path?: string;
  /** Per-project auth token issued at register; required on update/status/live. */
  token: string;
  /** Live: a liveness connection is open, or the last on-demand probe succeeded. */
  online: boolean;
  registeredAt: string;
  lastSeenAt: string;
  state: MasterProjectState;
}

/**
 * N219 — the client-safe view of a project entry. The per-project `token` (and
 * the server-only `url`/`path`) are deliberately omitted: the browser only ever
 * needs the stable `projectId` to build a `/project/<id>` link, plus display
 * state. Every client sink (overview page data, `/api/hub/projects`, SSE frames)
 * serializes this, never the full `MasterProjectEntry`.
 */
export interface PublicProjectEntry {
  id: string;
  projectId: string;
  label: string;
  online: boolean;
  lastSeenAt: string;
  state: MasterProjectState;
}
