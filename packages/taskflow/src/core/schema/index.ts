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
// N89/N92 — agent-module composition: everything is a module. A composed agent
// is a single ordered list of registered module ids rendered as a pure
// sequence (each module = one standalone block, no heading-targeted merging).
// Shared modules use flat ids ("minimal-diff"); role-scoped modules are
// namespaced as "<role>/<slug>" ("task-implement/input-contract");
// integration modules as "<integration>/<slug>" ("testing/hook").
// N92 adds heterogeneous kinds: one contribution per module (siblings group an
// integration), so MD composition stays a pure text sequence while `mcp-server`
// / `hook` / `skill` modules feed the artifact emitter (agents/emit.ts).
// ---------------------------------------------------------------------------

const agentModuleBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  // Short human-readable summary for browsing UIs (N93). Ignored by the
  // composer/emitter — never rendered into role MD or artifacts.
  description: z.string().optional(),
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
  // MCP-server module: merged into the project's .mcp.json under
  // `mcpServers[name]`, deduped by name (same-name different-config errors).
  z.object({
    ...agentModuleBase,
    kind: z.literal("mcp-server"),
    name: z.string().min(1),
    config: z.record(z.string(), z.unknown()),
  }),
  // Hook module: a Claude Code settings hook registration, reconciled into
  // `.claude/settings.json` via the taskflow-managed manifest. A hook may ship
  // its own script (written to `.claude/hooks/<script.name>`, 0755) — the
  // command then typically references it via ${CLAUDE_PROJECT_DIR}. Script
  // names are path-segment-restricted, like skill names. `__VAR__` tokens in
  // command/script content are substituted by the emitter (e.g.
  // __INSIGHT_FLOW_BIN__ for the project's CLI invocation).
  z.object({
    ...agentModuleBase,
    kind: z.literal("hook"),
    event: z.string().min(1),
    matcher: z.string().optional(),
    command: z.string().min(1),
    timeout: z.number().int().positive().optional(),
    script: z
      .object({
        name: z
          .string()
          .min(1)
          .regex(/^[a-z0-9][a-z0-9.-]*$/, "hook script name must be a safe path segment"),
        content: z.string().min(1),
      })
      .optional(),
  }),
  // Skill module: written to `.claude/skills/<name>/SKILL.md`. The name is a
  // path segment — restrict it so it can never traverse.
  z.object({
    ...agentModuleBase,
    kind: z.literal("skill"),
    name: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "skill name must be a safe path segment"),
    content: z.string().min(1),
  }),
  // Bundle module (N95): a module composed of other registry modules — the
  // "molecule" tier (e.g. an integration = its MCP + prompt + hook atoms).
  // Expanded recursively at resolution time; contributes nothing itself.
  z.object({
    ...agentModuleBase,
    kind: z.literal("bundle"),
    modules: z.array(z.string().min(1)).min(1),
  }),
]);

export const ComposedAgentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // Short human-readable summary for browsing UIs (N93); not part of the MD.
  description: z.string().optional(),
  // Ordered registry ids; the author controls placement explicitly.
  modules: z.array(z.string().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// N96 — project layer (the atomic-design top tier): which agents a project
// uses, how they relate (the lifecycle flow), and what it installs globally.
// DESCRIPTIVE this iteration: the flow visualizes/audits behavior that is
// still enforced by the status machine, the next* pickers, and role prompts.
// A later iteration flips it prescriptive (those read FROM this data).
// Triggers reuse TaskStatusSchema so a status rename breaks tests loudly
// instead of letting the diagram drift silently.
// ---------------------------------------------------------------------------

export const ProjectFlowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  // The status/verdict that moves work along this edge; omitted = direct
  // handoff (e.g. analyzer → taskmaster on human go-ahead).
  on: TaskStatusSchema.optional(),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  // Composed-agent ids this project uses (validated against COMPOSED_AGENTS
  // at load, not here — the schema stays registry-agnostic).
  agents: z.array(z.string().min(1)).min(1),
  flow: z.array(ProjectFlowEdgeSchema).default([]),
  // Module/bundle ids installed at project level (hooks, skills, MCP).
  install: z.array(z.string().min(1)).default([]),
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
