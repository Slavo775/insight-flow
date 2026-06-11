import { z, type ZodError } from "zod";

export const TaskStatusSchema = z.enum([
  "ready",
  "in-progress",
  "implemented",
  "reviewing",
  "approved",
  "fix-needed",
  "fixing",
  "fixed",
  "pushed",
  "merged",
  "done",
  "request-changes",
  "changes-requested",
  "changes-implementing",
  "changes-implemented",
]);

export const StatusHistoryEntrySchema = z.object({
  status: z.string(),
  at: z.string(),
  by: z.string(),
});

export const ReviewFixSchema = z.object({
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  status: z.string(),
  filesChanged: z.array(z.string()),
  comment: z.string().nullable(),
  by: z.string(),
});

export const ReviewSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  verdict: z.string().nullable(),
  comment: z.string().nullable(),
  type: z.enum(["ai", "human"]),
  by: z.string(),
  fix: ReviewFixSchema.nullable(),
});

export const PushSchema = z.object({
  at: z.string(),
  commitHash: z.string(),
  commitMessage: z.string(),
});

export const IncidentStatusEntrySchema = z.object({
  status: z.string(),
  at: z.string(),
  by: z.string().optional(),
});

export const IncidentSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: IncidentSeveritySchema,
  status: z.string(),
  reportedAt: z.string(),
  resolvedAt: z.string().nullable(),
  branch: z.string(),
  description: z.string().nullable(),
  rootCause: z.string().nullable(),
  fix: z.string().nullable(),
  statusHistory: z.array(IncidentStatusEntrySchema),
});

export const ChangeRequestSchema = z.object({
  requestedAt: z.string(),
  description: z.string(),
  requestedBy: z.string(),
  status: z.string(),
  implementedAt: z.string().nullable(),
  filesChanged: z.array(z.string()),
  comment: z.string().nullable(),
  implementedBy: z.string().nullable(),
});

export const TaskSchema = z.object({
  id: z.string().regex(/^N\d{2,}$/),
  title: z.string(),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  folder: z.string(),
  createdAt: z.string(),
  statusHistory: z.array(StatusHistoryEntrySchema),
  implementation: z.object({
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    filesChanged: z.array(z.string()),
    tokensUsed: z.number().nullable(),
  }),
  // reviews/incidents live in per-task side files (reviews.json, incidents.json).
  // Both remain accepted inline for legacy shards predating the split.
  reviews: z.array(ReviewSchema).optional(),
  changesAfterImplementation: z.array(ChangeRequestSchema),
  incidents: z.array(IncidentSchema).optional(),
  reviewCount: z.number().int().min(0).optional(),
  lastReviewVerdict: z.string().nullable().optional(),
  openIncidentCount: z.number().int().min(0).optional(),
  committedAt: z.string().nullable(),
  totalDurationMinutes: z.number().nullable(),
  tags: z.array(z.string()),
  pushes: z.array(PushSchema).default([]),
  branch: z.string().nullable().default(null),
  mrUrl: z.string().nullable().default(null),
  mergedAt: z.string().nullable().default(null),
});

export const ShardFileSchema = z.object({
  range: z.object({
    from: z.number().int().min(0),
    to: z.number().int().min(0),
  }),
  tasks: z.array(TaskSchema),
});

export const ReviewsFileSchema = z.object({
  taskId: z.string().regex(/^N\d{2,}$/),
  reviews: z.array(ReviewSchema),
});

export const IncidentsFileSchema = z.object({
  taskId: z.string().regex(/^N\d{2,}$/),
  incidents: z.array(IncidentSchema),
});

export const MasterConfigSchema = z.object({
  url: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  standalone: z.boolean().optional(),
  startMasterLocally: z.boolean().optional(),
});

export const MasterFileSchema = z.object({
  meta: z.object({
    nextId: z.number().int().min(0),
    currentTaskId: z.string().nullable().default(null),
    nextIncidentId: z.number().int().min(1).default(1),
    shards: z.array(z.string().regex(/^tasks-N\d{2,}-N\d{2,}\.json$/)),
  }),
});

export const EventTypeSchema = z.enum([
  "start",
  "done",
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
]);

// Which editor/agent produced an event (N76). Optional everywhere; absent is
// treated as "claude". Extend the enum when a new editor provider lands.
export const ProviderSchema = z.enum(["claude", "cursor"]);

export const TaskEventSchema = z.object({
  type: EventTypeSchema,
  taskId: z.string(),
  timestamp: z.string(),
  source: z.enum(["agent", "hook"]).optional(),
  provider: ProviderSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const ClaudeHookEventTypeSchema = z.enum([
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
]);

export const ClaudeHookEventSchema = z.object({
  id: z.string(),
  type: ClaudeHookEventTypeSchema,
  source: z.literal("hook"),
  hookName: z.string(),
  timestamp: z.string(),
  sessionId: z.string().optional(),
  taskId: z.string().optional(),
  provider: ProviderSchema.optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const SessionEventsFileSchema = z.object({
  sessionId: z.string(),
  events: z.array(ClaudeHookEventSchema),
});

export const EventsFileSchema = z.object({
  taskId: z.string().regex(/^N\d{2,}$/),
  events: z.array(z.union([TaskEventSchema, ClaudeHookEventSchema])),
});

// ---------------------------------------------------------------------------
// N68 — server-side hook event ingestion (`POST /log/events`)
// ---------------------------------------------------------------------------

export const ProjectStatusSchema = z.enum(["active", "awaiting-permission", "idle", "done"]);

export const HookEventInputSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  // type is free-form to forward-compat with new Claude Code hook events
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
  taskId: z.string().optional(),
  // Lenient at the ingestion boundary (like `type` above): a future provider
  // POSTing /log/events is accepted rather than rejected 400. The internal
  // TaskEvent / ClaudeHookEvent schemas keep the strict ProviderSchema enum.
  provider: z.string().optional(),
});

// ---------------------------------------------------------------------------
// N89 — agent-module composition v2: everything is a module. A composed agent
// is a single ordered list of registered module ids rendered as a pure
// sequence (each module = one standalone block, no heading-targeted merging).
// Shared modules use flat ids ("minimal-diff"); role-scoped modules are
// namespaced as "<role>/<slug>" ("task-implement/input-contract").
// Text-only for this round (no MCP/hook/skill contributions yet).
// ---------------------------------------------------------------------------

const agentModuleBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.enum(["builtin", "custom"]).default("builtin"),
};

export const AgentModuleSchema = z.discriminatedUnion("kind", [
  // Section module: an optional heading line + pre-formatted body. A module
  // may be heading-only (reserves the section; following modules continue it)
  // or body-only (continues the previous block, e.g. shared bullets appended
  // under the preceding module's heading).
  z
    .object({
      ...agentModuleBase,
      kind: z.literal("section"),
      heading: z.string().optional(),
      body: z.string().default(""),
    })
    .refine((m) => (m.heading ?? "").length > 0 || m.body.trim().length > 0, {
      message: "section module needs a heading or a non-empty body",
    }),
  // Include module: emits a verbatim `@<ref>` reference line
  // (ref "AGENT_ENFORCEMENT.md" → `@AGENT_ENFORCEMENT.md`).
  z.object({
    ...agentModuleBase,
    kind: z.literal("include"),
    ref: z.string().min(1),
  }),
]);

export const ComposedAgentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // Ordered registry ids; the author controls placement explicitly.
  modules: z.array(z.string().min(1)).min(1),
});

export class TaskflowValidationError extends Error {
  readonly file: string;
  readonly issuePath: string;
  readonly expected: string;
  readonly received: string;

  constructor(file: string, error: ZodError) {
    const issue = error.issues[0];
    const issuePath = issue?.path.join(".") || "(root)";
    const expected = issue && "expected" in issue ? String(issue.expected) : "valid value";
    const received = issue && "received" in issue ? String(issue.received) : "invalid";
    super(
      `Taskflow validation error in ${file} at "${issuePath}": ${
        issue?.message ?? "validation failed"
      } (expected ${expected}, got ${received})`,
    );
    this.name = "TaskflowValidationError";
    this.file = file;
    this.issuePath = issuePath;
    this.expected = expected;
    this.received = received;
  }
}
