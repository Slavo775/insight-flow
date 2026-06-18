import { z, type ZodError } from "zod";
import { TASK_STATUSES } from "../statuses.js";

export const TaskStatusSchema = z.enum(TASK_STATUSES);

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
  // N116 — the project flow that governs this task ("default" or "custom:<slug>").
  // Legacy tasks without it read back as "default" — zero behavior change.
  flowId: z.string().default("default"),
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

// N103 review-fix — definition ids must be filename-safe so the user-space
// CRUD layer's `<id-tail>.json` mapping is bijective: two distinct ids can
// never slug-collide onto one file (which silently overwrote a record). Custom
// ids ("custom:<tail>") are constrained to a lowercase slug; built-in ids
// (no "custom:" prefix — they use "/" and flat names) are left untouched.
const CUSTOM_PREFIX = "custom:";
const CUSTOM_TAIL_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const DefinitionIdSchema = z
  .string()
  .min(1)
  .refine(
    (id) =>
      !id.startsWith(CUSTOM_PREFIX) || CUSTOM_TAIL_PATTERN.test(id.slice(CUSTOM_PREFIX.length)),
    {
      message:
        "custom id must be 'custom:' followed by lowercase letters, digits, and hyphens (e.g. custom:my-module)",
    },
  );

const agentModuleBase = {
  id: DefinitionIdSchema,
  title: z.string().min(1),
  // Short human-readable summary for browsing UIs (N93). Ignored by the
  // composer/emitter — never rendered into role MD or artifacts.
  description: z.string().optional(),
  source: z.enum(["builtin", "custom"]).default("builtin"),
  // N106 — harness target. Descriptive metadata this round (authoring UI +
  // browsing); emitters apply contributions to both harnesses regardless and
  // start honoring it in a later iteration. Absent = "both".
  target: z.enum(["claude", "cursor", "both"]).optional(),
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
  // Status-transition module (N128): behavior-as-data. Declares that `agent`,
  // on completing its turn, advances the task to status `sets` (optionally only
  // when transitioning `from` a given status). The transition engine (N131) and
  // role prompts (N133) read these instead of hardcoded literals, so a custom
  // flow's agents emit that flow's own statuses. The canonical lifecycle's
  // transition modules are LOCKED (not user-overridable). Contributes nothing
  // to the artifact emitter or the composed role Markdown.
  z.object({
    ...agentModuleBase,
    kind: z.literal("status-transition"),
    agent: z.string().min(1),
    sets: z.string().min(1),
    from: z.string().min(1).optional(),
  }),
  // Handover module (N142): behavior-as-data. Declares that the agent this
  // module is composed into, on completing its turn, hands work over to agent
  // `to` (optionally only when the task is at status `on`). `mode` governs how:
  // `auto` chains the target's slash-command in-session; `gated` (the default)
  // stops for an explicit human go-ahead first. DESCRIPTIVE — the agent honors
  // this from its composed prompt; nothing in the system auto-runs and the flow
  // diagram stays non-binding (the agent's handovers win). Like
  // `status-transition`, the canonical lifecycle's handovers are LOCKED (not
  // user-overridable) and the module contributes nothing to the artifact
  // emitter (it renders into role Markdown only).
  z.object({
    ...agentModuleBase,
    kind: z.literal("handover"),
    to: z.string().min(1),
    on: z.string().min(1).optional(),
    mode: z.enum(["auto", "gated"]).default("gated"),
    label: z.string().min(1).optional(),
  }),
]);

// N138 — the built-in slash-command names a custom agent's emitted command must
// not collide with.
export const RESERVED_COMMAND_NAMES = [
  "task-analyze",
  "taskmaster",
  "taskmaster-change",
  "task-implement",
  "task-review",
  "task-review-fix",
  "task-human-review",
  "task-git",
  "task-incident",
  "task-request-changes",
] as const;

// N138 — derive the installed slash-command/skill name for an agent: the id tail
// (minus the `custom:` prefix), namespaced under `task-` unless it already starts
// with `task` (no double-prefix). DefinitionIdSchema guarantees a safe slug, so
// the result is always a safe path segment (command filename / skill dir).
export function deriveCommandName(agentId: string): string {
  const tail = agentId.replace(/^custom:/, "");
  return /^task/.test(tail) ? tail : `task-${tail}`;
}

export const ComposedAgentSchema = z
  .object({
    id: DefinitionIdSchema,
    title: z.string().min(1),
    // Short human-readable summary for browsing UIs (N93); not part of the MD.
    description: z.string().optional(),
    // Ordered registry ids; the author controls placement explicitly.
    modules: z.array(z.string().min(1)).min(1),
    // N138 — opt-in: when this agent's flow is installed, also install a runnable
    // slash command (the composed prompt) or a skill. Name = deriveCommandName(id).
    command: z
      .object({
        install: z.boolean(),
        as: z.enum(["command", "skill"]).default("command"),
      })
      .optional(),
  })
  .superRefine((def, ctx) => {
    if (def.command?.install) {
      const name = deriveCommandName(def.id);
      if ((RESERVED_COMMAND_NAMES as readonly string[]).includes(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["command"],
          message: `command name '${name}' collides with a built-in command — rename the agent`,
        });
      }
    }
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
  // handoff (e.g. analyzer → taskmaster on human go-ahead). N112: free-form
  // at the field level — the per-project superRefine constrains it to the
  // canonical enum ∪ the flow's own custom state ids.
  on: z.string().min(1).optional(),
  // N147 — edge-level handover (PROJECT-SCOPED): when present, this relation is
  // a handover — the source agent hands work to `to`, and at flow-install time
  // (N149) the source agent's emitted prompt gains a `## Handover` section.
  // Independent of `on`: a relation may be a plain status-change (trigger only),
  // a pure handover (no trigger), or both. `mode` governs whether the agent
  // chains the next command in-session (`auto`) or stops for an explicit human
  // go-ahead (`gated`, the default). Stored on the edge, not the agent, so it
  // works for built-in/locked source agents without mutating the shared agent.
  handover: z.object({ mode: z.enum(["auto", "gated"]).default("gated") }).optional(),
});

// N112 — a per-flow custom state: a display alias for exactly one canonical
// status. Visual + suggestion layer only — tasks never store these ids and
// the pickers/state machine stay canonical (prescriptive is a future round).
export const ProjectStateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  color: z.string().optional(),
  mapsTo: TaskStatusSchema,
});

// N128 — a flow's own status: the building block of full custom statuses.
// `id` is the value a task stores in Task.status; `title` is the display label
// (badges/kanban); `color` styles badges/columns (N130); `terminal` marks an
// end state (e.g. merged/done) with no outgoing transition. The shipped default
// flow declares the canonical enum (TASK_STATUSES) verbatim, so its behavior is
// byte-identical — this is data only; the engine still uses canonical literals
// until N131. An empty `statuses` set falls back to the canonical universe.
export const FlowStatusSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  color: z.string().optional(),
  terminal: z.boolean().optional(),
});

export const ProjectSchema = z
  .object({
    id: DefinitionIdSchema,
    title: z.string().min(1),
    description: z.string().optional(),
    // Composed-agent ids this project uses (validated against COMPOSED_AGENTS
    // at load, not here — the schema stays registry-agnostic).
    agents: z.array(z.string().min(1)).min(1),
    flow: z.array(ProjectFlowEdgeSchema).default([]),
    // Module/bundle ids installed at project level (hooks, skills, MCP).
    install: z.array(z.string().min(1)).default([]),
    // N109 — hand-arranged map positions keyed by agent id. Optional: absent
    // entries (or the whole field) fall back to the auto-layout.
    layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
    // N112 — per-flow custom states (aliases onto canonical statuses).
    states: z.array(ProjectStateSchema).default([]),
    // N128 — the flow's own ordered status set. The shipped default flow declares
    // the canonical enum (TASK_STATUSES); empty ⇒ falls back to canonical (so
    // N108–N122 custom flows authored before this field keep validating exactly).
    statuses: z.array(FlowStatusSchema).default([]),
    // N122 — the flow's main/entry agent(s): invoking one binds a task to this
    // flow (N123). Must be a subset of `agents`. Empty ⇒ not selectable by agent.
    entryAgents: z.array(z.string().min(1)).default([]),
  })
  .superRefine((project, ctx) => {
    // N122 — entry agents must be declared agents of the flow.
    project.entryAgents.forEach((id, index) => {
      if (!project.agents.includes(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["entryAgents", index],
          message: `entry agent '${id}' is not one of the flow's agents`,
        });
      }
    });

    // N128 — the flow's status universe: its declared set, or the canonical
    // enum when it declares none (back-compat for pre-N128 flows). Edges,
    // states, and (later) transition modules reference only ids in this set.
    const canonical = new Set<string>(TASK_STATUSES);
    const statusIds = project.statuses.length
      ? new Set(project.statuses.map((s) => s.id))
      : canonical;

    // N128 — status ids must be unique within the flow.
    const statusSeen = new Set<string>();
    project.statuses.forEach((status, index) => {
      if (statusSeen.has(status.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["statuses", index, "id"],
          message: `duplicate status id '${status.id}'`,
        });
      }
      statusSeen.add(status.id);
    });

    // N112/N128 — state ids must be unique and must not shadow a status of this
    // flow; their `mapsTo` alias must resolve to a status the flow declares
    // (only enforced once the flow opts into a custom set — an empty set keeps
    // the canonical universe, so canonical mapsTo values always resolve).
    const stateIds = new Set<string>();
    project.states.forEach((state, index) => {
      if (statusIds.has(state.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["states", index, "id"],
          message: `state id '${state.id}' shadows a status of this flow`,
        });
      }
      if (stateIds.has(state.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["states", index, "id"],
          message: `duplicate state id '${state.id}'`,
        });
      }
      if (project.statuses.length && !statusIds.has(state.mapsTo)) {
        ctx.addIssue({
          code: "custom",
          path: ["states", index, "mapsTo"],
          message: `state maps to '${state.mapsTo}', not a status of this flow`,
        });
      }
      stateIds.add(state.id);
    });

    // N110/N112/N128 — edge triggers must be a status of THIS flow or a state
    // it defines; duplicates of the (from, to, on) triple are editor mistakes.
    const seen = new Set<string>();
    project.flow.forEach((edge, index) => {
      if (edge.on && !statusIds.has(edge.on) && !stateIds.has(edge.on)) {
        ctx.addIssue({
          code: "custom",
          path: ["flow", index, "on"],
          message: `unknown trigger '${edge.on}' (not a status or a state of this flow)`,
        });
      }
      const key = `${edge.from}→${edge.to}:${edge.on ?? ""}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["flow", index],
          message: `duplicate flow edge ${edge.from} → ${edge.to} on '${edge.on ?? "handoff"}'`,
        });
      }
      seen.add(key);
    });
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
