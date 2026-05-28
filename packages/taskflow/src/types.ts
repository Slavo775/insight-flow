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
  /**
   * Reviews live in `<folder>/reviews.json` as of schema v2. Inline arrays may
   * still appear in legacy shards; treat both as the same data. New writes go
   * to the side file only.
   */
  reviews?: Review[];
  changesAfterImplementation: ChangeRequest[];
  /** Incidents live in `<folder>/incidents.json` as of schema v2. */
  incidents?: Incident[];
  reviewCount?: number;
  lastReviewVerdict?: string | null;
  openIncidentCount?: number;
  committedAt: string | null;
  totalDurationMinutes: number | null;
  tags: string[];
  pushes: Push[];
  branch: string | null;
  mrUrl: string | null;
  mergedAt: string | null;
}

export interface ReviewsFile {
  taskId: string;
  reviews: Review[];
}

export interface IncidentsFile {
  taskId: string;
  incidents: Incident[];
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

export const MANDATORY_EVENT_TYPES = ["start", "done"] as const;
export const OPTIONAL_EVENT_TYPES = [
  "active",
  "idle",
  "edit-start",
  "edit-end",
  "research-start",
  "research-end",
  "review-start",
  "review-end",
  "git-start",
  "git-end",
] as const;
export const EVENT_TYPES = [...MANDATORY_EVENT_TYPES, ...OPTIONAL_EVENT_TYPES] as const;
export type MandatoryEventType = (typeof MANDATORY_EVENT_TYPES)[number];
export type OptionalEventType = (typeof OPTIONAL_EVENT_TYPES)[number];
export type EventType = (typeof EVENT_TYPES)[number];

export interface TaskEvent {
  type: EventType;
  taskId: string;
  timestamp: string;
  source?: "agent" | "hook";
  data?: Record<string, unknown>;
}

/**
 * Two event-type vocabularies live in this file. They are NOT interchangeable:
 *
 *   - `CLAUDE_HOOK_EVENT_TYPES` (dash-case) — derived event names used by the
 *     legacy log-event CLI path: `agent-idle`, `approval-required`, etc.
 *     These are what hook scripts pass as the `--type` arg and what gets
 *     written to per-task `events.json` + the activity feed.
 *
 *   - `CLAUDE_HOOK_TYPES` (CamelCase) — raw Claude Code hook event names:
 *     `Stop`, `Notification`, `PreToolUse`, etc. These are what arrive at the
 *     N68 `/log/events` endpoint as the `type` discriminator, and what the
 *     server-side status derivation primarily keys off.
 *
 * The CLI `hook` subcommand and `cmdLogEvent`'s hook path bridge the two:
 * `hookName` stores the raw CamelCase name, `type` stores the derived
 * dash-case one, and the server accepts either form in `statusFromEvent`.
 * Future contributors: pick the right vocabulary for the layer you're in.
 */
export const CLAUDE_HOOK_EVENT_TYPES = [
  "session-start",
  "session-end",
  "agent-active",
  "agent-idle",
  "turn-failed",
  "tool-requested",
  "tool-approved",
  "tool-failed",
  "approval-required",
  "approval-granted",
  "approval-denied",
  "tool-blocked",
  "subagent-start",
  "subagent-done",
  "file-written",
  "file-edited",
  "context-compacted",
  "config-changed",
  "notification",
  "task-batch-done",
] as const;

export type ClaudeHookEventType = (typeof CLAUDE_HOOK_EVENT_TYPES)[number];

export interface ClaudeHookEvent {
  id: string;
  type: ClaudeHookEventType;
  source: "hook";
  hookName: string;
  timestamp: string;
  sessionId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
}

export interface SessionEventsFile {
  sessionId: string;
  events: ClaudeHookEvent[];
}

// ---------------------------------------------------------------------------
// N68 — server-side hook event ingestion (`POST /log/events`)
// ---------------------------------------------------------------------------

/**
 * Project-level status derived from the latest hook event by timestamp.
 * - `active`  — Claude is working (any hook event other than Stop / Notification).
 * - `awaiting-permission` — Notification hook fired with permission wording.
 * - `idle`    — Notification hook fired with idle/waiting-for-input wording.
 * - `done`    — Stop hook (Claude finished its turn).
 */
export const PROJECT_STATUSES = ["active", "awaiting-permission", "idle", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Raw Claude Code hook event names — used as the canonical `type` discriminator
 * in `HookEventInput`. New entries can appear as Claude Code adds hook events;
 * `HookEventInput.type` is intentionally a free-form string so unknown values
 * are accepted and simply mapped to `active`.
 */
export const CLAUDE_HOOK_TYPES = [
  "SessionStart",
  "SessionEnd",
  "Stop",
  "Notification",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "PreCompact",
  "SubagentStop",
] as const;
export type ClaudeHookType = (typeof CLAUDE_HOOK_TYPES)[number];

/**
 * Payload for `POST /log/events`. Hooks generate a UUID + ISO timestamp,
 * preserve the raw Claude Code hook type, and pass through the hook input
 * payload unchanged. The server orders by `timestamp`, not arrival order.
 */
export interface HookEventInput {
  id: string;
  timestamp: string;
  type: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  taskId?: string;
}

/** WebSocket frame: emitted on every accepted /log/events POST. */
export interface EventFrame {
  kind: "event";
  event: HookEventInput;
}

/** WebSocket frame: emitted only when derived status transitions. */
export interface StatusFrame {
  kind: "status";
  from: ProjectStatus;
  to: ProjectStatus;
  at: string;
  latestEventId: string;
}

export interface EventsFile {
  taskId: string;
  events: (TaskEvent | ClaudeHookEvent)[];
}

export interface EventsConfig {
  dedupWindowSeconds?: number;
  hooks?: Partial<Record<EventType, string[]>>;
}

export interface ActivityEvent {
  id?: string;
  ts: string;
  tool: string;
  action: string;
  file?: string;
  taskId?: string;
  duration?: number;
  status?: string;
  session?: string;
  label?: string;
  message?: string;
  skill?: string;
}

export interface ActivityEngineConfig {
  enabled: boolean;
  logFile: string;
  maxEvents: number;
  phaseMarkers?: boolean;
  hookEnrichment?: boolean;
  verbosity?: "milestones" | "detailed" | "both";
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

export interface AgentGitPermissions {
  // shorthand: "deny" blocks push/forcePush/deleteBranchRemote/createPR unless overridden by individual flags
  remoteOps?: "allow" | "deny";
  createBranch?: boolean;       // git checkout -b  (local)
  checkout?: boolean;           // git checkout <existing branch>  (local)
  commit?: boolean;             // git commit  (local)
  push?: boolean;               // git push (to remote)
  forcePush?: boolean;          // git push --force
  merge?: boolean;              // git merge (to main)
  deleteBranchLocal?: boolean;  // git branch -d  (local)
  deleteBranchRemote?: boolean; // git push origin --delete
  createPR?: boolean;           // gh / glab pr/mr create
}

export interface AgentsConfig {
  extend?: AgentExtensions;
  custom?: CustomAgent[];
  git?: { permissions?: AgentGitPermissions };
}

export interface NotificationsConfig {
  browser?: boolean;
  cli?: boolean;
  sounds?: { enabled?: boolean };
}

export interface MasterConfig {
  url?: string;
  port?: number;
  standalone?: boolean;
  startMasterLocally?: boolean;
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
  notifications?: NotificationsConfig;
  master?: MasterConfig;
  events?: EventsConfig;
  /**
   * Marker for the hook-script generation shipped with the installed package.
   * Bumped whenever the bundled hook layout in `activity-hook.ts` changes
   * (N68). The CLI compares this against the package's bundled version and
   * warns when a consumer needs to run `insight-flow migrate-hooks`.
   */
  hooksVersion?: number;
}

export interface ParsedArgs {
  _: string[];
  [key: string]: string | boolean | string[];
}

export interface BatchUiEntry {
  label: string;
  path: string;
}

export interface BatchUiRunningProcess {
  label: string;
  pid: number;
  port: number;
}

export interface BatchUiRegistry {
  entries: BatchUiEntry[];
  lastSelected: string[];
  runningPids: BatchUiRunningProcess[];
}
