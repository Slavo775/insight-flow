// N196 (round 5) — authoritative "how to author composer entities" conventions.
//
// SINGLE SOURCE for both halves of the B+C fix:
//   B) the `composer-authoring-conventions` section module composed into the
//      authoring orchestrator agents (compose.ts), and
//   C) the composer MCP `describe` tool the subagents call at runtime
//      (mcp/composer.ts).
// Keeping it here (next to the schema's intent) means the rules don't fragment or
// go stale across 12 subagent prompts.

/** Cross-cutting rules that bind every authored definition. */
export const COMPOSER_RULES = `**Authoring rules (apply to every kind)**

- **IDs.** A new definition uses a \`custom:\` id (e.g. \`custom:my-module\`). To change a *shipped* definition, reuse its exact id — that ejects/overrides it. Never duplicate a built-in under a new id.
- **Reuse-first decision rule (always apply before authoring).** \`list\`/\`get\` the registry for a definition that matches or is similar, then:
  1. **Exact / near match** → reuse it as-is.
  2. **Needs only a small change** (an argument, a port, a label, …) **AND is not referenced anywhere** (no agent/flow/module depends on it) → reuse it by **editing in place** (\`update_*\`); do not create a duplicate.
  3. **Small change but it IS referenced elsewhere** → editing would change behaviour for those consumers, so do NOT silently edit — create a minimal variant (new \`custom:\` id) or **ask the user**.
  4. **Needs a wider rework** → **STOP and ask the user** whether to rework it; never rework unilaterally.
  5. **Create a brand-new \`custom:\` definition only when nothing suitable exists** to reuse or extend.
  (Whether a definition is "referenced anywhere" is reported by the analyst — it drives the edit-in-place vs variant vs ask choice.)
- **Locked tier (refused).** Never override \`security\` / \`enforcement\` / \`protocol\`, nor any built-in \`status-transition\` or \`handover\` module — these are locked and the write is refused. Built-in *flows* are also refused over MCP (edit in the dashboard).
- **Agent baseline.** Every authored agent composes, in order: \`<role>/identity\`, \`security\`, \`enforcement\`, \`protocol\`, [role sections], [handover modules], \`actions\` — plus the activity engine when the user opted in.
- **Relationships.** Handovers carry a \`when\` reason and a deliberate \`auto\`/\`gated\` mode; never auto-chain a cycle back-edge. A handover moves the single task token (a 1-of-N branch). For parallelism, use \`subagents\` (fan-out), not handovers.
- **Validate by building.** Invalid defs are rejected on create/update; every referenced id (module/agent/subagent/edge endpoint) must resolve. Pass the \`revision\` from \`get\` on \`update_*\` for concurrency safety.`;

/** Per-kind creation shapes. Detailed; points at a live built-in as a template. */
export const KIND_SHAPES: Record<"module" | "agent" | "flow", string> = {
  module: `**Create a MODULE** — \`create_module({ def })\`

Base: \`{ id, title, kind, source?, description? }\` where \`kind\` is one of:
section · include · mcp-server · hook · skill · bundle · status-transition · handover · subagent.

Kind-specific fields:
- **section** → \`{ heading, body }\` (a prompt section).
- **subagent** → \`{ name, content, description?, tools?, model?, readonly?, background? }\` — emits \`.claude/agents/<name>.md\` (read by Claude and Cursor). \`name\` is \`[a-z0-9][a-z0-9-]*\`; \`tools\`/\`model\` are \`[A-Za-z0-9._-]+\`.
- **handover** → \`{ to, mode: "auto"|"gated", when?, on? }\` (to = target agent id).
- **include** → \`{ ref }\` (path to a shipped .md).
- **status-transition / hook / skill / bundle / mcp-server** → \`get\` a built-in of that kind as a template before authoring.

Template: \`get({ kind: "module", id: "<a built-in of the target kind>" })\`.`,

  agent: `**Create an AGENT** — \`create_agent({ def })\`

Shape: \`{ id, title, description?, modules: string[], subagents?: string[], command?: { install?: boolean } }\`.
- \`modules\` — ordered module ids; follow the baseline order above.
- \`subagents\` — subagent-module ids this agent fans out to (orchestrator pattern); the parent waits and rejoins automatically.
- \`command.install: true\` — emit the composed prompt as a runnable slash command on install.

Template: \`get({ kind: "agent", id: "task-review" })\`.`,

  flow: `**Create a FLOW** — \`create_flow({ def })\`

Shape: \`{ id, title, description?, agents: string[], flow: { from, to, on? }[], entryAgents?: string[], statuses?: { id, title?, color?, terminal? }[], install?: string[] }\`.
- \`flow\` edges are **structural** (\`from\`/\`to\`/optional \`on\` status); the behavioural handovers live in the agents' handover *modules*.
- \`agents\` must include every edge endpoint; an edge \`to\` may be an agent or a declared terminal status.
- \`statuses\` — the flow's status universe (a status write is valid iff it is in this set); include a terminal node. \`entryAgents\` ⊆ \`agents\`. \`install\` — module/bundle ids applied on flow install.

Template: \`get({ kind: "flow", id: "default" })\` or \`composer-authoring\`.`,
};

/** Full authoritative description for a kind (or all kinds when omitted). */
export function describeComposer(kind?: "module" | "agent" | "flow"): string {
  const shapes = kind ? KIND_SHAPES[kind] : Object.values(KIND_SHAPES).join("\n\n");
  return `${COMPOSER_RULES}\n\n${shapes}`;
}

/**
 * Concise body for the shared module (B) composed into orchestrators — the rules
 * plus a pointer to the MCP \`describe\` tool (C) for the exact per-kind shapes,
 * so orchestrator prompts stay lean while the full detail is fetched on demand.
 */
export const CONVENTIONS_MODULE_BODY = `${COMPOSER_RULES}\n\nFor the exact creation shape of each kind (module/agent/flow + the kind-specific fields), call the composer MCP \`describe({ kind })\` — and \`get\` an existing definition as a working template.`;
