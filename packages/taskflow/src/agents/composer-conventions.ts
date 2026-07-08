// N196 (round 5) — authoritative "how to author composer entities" conventions.
//
// SINGLE SOURCE for both halves of the B+C fix:
//   B) the `composer-authoring-conventions` section module composed into the
//      authoring orchestrator agents (compose.ts), and
//   C) the composer MCP `describe` tool the subagents call at runtime
//      (mcp/composer.ts).
// Keeping it here (next to the schema's intent) means the rules don't fragment or
// go stale across 12 subagent prompts.

/**
 * N200 — a short, plain-language primer on how the model fits together, so the
 * analyst/authoring agents share one mental model before the detailed rules.
 */
export const MODEL_PRIMER = `**How the pieces fit (read this first)**

insight-flow builds AI roles from three nested parts — small parts make bigger parts:

- **Module** — the smallest part: one piece of a prompt or one capability. Kinds: \`section\` (prompt text), \`include\` (a shared file), \`mcp-server\` (an MCP tool server), \`hook\` (a lifecycle script), \`skill\`, \`bundle\` (a group of modules), \`status-transition\`, \`handover\`, \`subagent\`.
- **Agent** — an ordered list of modules that composes into one runnable role prompt. An agent can fan out to \`subagent\` modules for parallel work.
- **Flow** — a set of agents joined by edges; this is the project layer. A flow has:
  - an **entry point** (\`entryAgents\`) — the agent a person starts with;
  - **relations / edges** — \`{ from, to, on? }\` that move the single task token from one agent to the next when a status (\`on\`) is reached;
  - **handovers** — the behaviour on an edge: \`gated\` stops and waits for a human go-ahead; \`auto\` chains the next command in the same session. A handover carries a \`when\` reason. For parallel work use \`subagents\` (fan-out), not handovers;
  - a **terminator / finish** — an edge whose \`to\` is a terminal status (e.g. \`done\`) instead of an agent. Every flow needs one finish point.

**MCP discovery — by web search, no key.** When a role needs a tool that is an MCP server, find one by **web search** — there is nothing to install and no API key:
  - **GitHub MCP Registry** — \`github.com/mcp\`. A curated, reviewed directory (each server backed by its GitHub repo), with a no-auth API at \`api.mcp.github.com/v0/servers\`. Good first stop for quality.
  - **Official MCP Registry** — \`registry.modelcontextprotocol.io\`. The broad, canonical list, also a no-auth read API.
  Pick the smallest server that fits.

**MCP secrets.** If a server needs a key or token, author it as an \`mcp-server\` module with a \`\${VAR}\` placeholder in its \`config\` and an \`inputs\` entry marked \`secret\`. Then tell the user they can supply the real value **either way** (same file, two ways in): (a) through the **dashboard install UI**, which prompts for each \`\${VAR}\`, masks the \`secret\` inputs, and writes them to \`.insight-flow/secrets.local.json\` for them; or (b) by editing **this project's** \`.insight-flow/secrets.local.json\` by hand — the file at the project root (gitignored), **not** the global \`~/.insight-flow/\`. Secrets live per-project, never globally. Never hard-code a secret.`;

/** Cross-cutting rules that bind every authored definition. */
export const COMPOSER_RULES = `**Authoring rules (apply to every kind)**

- **Custom-only rule (built-in defaults are read-only).** Every definition you author uses a \`custom:\` id (e.g. \`custom:my-module\`). A shipped **built-in is a read-only template** — never author under a built-in id, and never edit a built-in in place (no ejecting/overriding a default). To change a built-in, author a \`custom:\` **variant** with its own id and reference that instead. (Editing a shipped built-in would make it un-upgradable; a custom variant keeps the default pristine and package-upgradable.) You may edit in place only a definition you already own — one whose id starts with \`custom:\`.
- **Reuse-first decision rule (always apply before authoring).** \`list\`/\`get\` the registry for a definition that matches or is similar, then:
  1. **Exact / near match, no change needed** → reuse it as-is (reference its id; author nothing).
  2. **Needs a small change** (an argument, a port, a label, …):
     - it is **your own \`custom:\` def, is not referenced anywhere** (no agent/flow/module depends on it), **and the edit is behaviour-preserving** (no hidden consequences for anything else) → edit it in place (\`update_*\`).
     - it is a **built-in**, OR it is **referenced elsewhere**, OR the change would alter behaviour → do NOT edit it; author a minimal \`custom:\` **variant** instead (editing a built-in is forbidden; editing a referenced def would change behaviour for its consumers).
  3. **Needs a wider rework** → **STOP and ask the user** before authoring the reworked \`custom:\` variant; never rework unilaterally.
  4. **Nothing suitable exists** → author a brand-new \`custom:\` definition.
  (Whether a definition is a built-in and whether it is "referenced anywhere" is reported by the analyst — it drives the reuse-as-is vs custom-variant vs ask choice.)
- **Minimal, and no collisions.** Author the smallest thing that works — one concern per module, no kitchen-sink modules; keep every definition as small as possible. A new \`custom:\` id or name must not duplicate or shadow an existing definition (built-in or custom) — \`list\`/\`get\` the registry first and reuse rather than re-create a near-duplicate.
- **Locked tier (refused).** Never override \`security\` / \`enforcement\` / \`protocol\`, nor any built-in \`status-transition\` or \`handover\` module — these are locked and the write is refused. Built-in *flows* are also refused over MCP (edit in the dashboard).
- **Agent baseline.** Every authored agent composes, in order: \`<role>/identity\`, \`security\`, \`enforcement\`, \`protocol\`, [role sections], [handover modules], \`actions\` — plus the activity engine when the user opted in.
- **Taskmasters are templated by default.** An agent whose job is to create or change tasks (a "taskmaster") composes the \`template-copy\` module by default — so every task it makes is scaffolded from the shared templates (\`insight-flow create\`) and then filled, keeping one structure. A taskmaster that writes build specs for modules/agents/flows (an authoring taskmaster) also composes \`authoring-spec-structure\`. Include these when authoring a custom taskmaster unless the user opts out.
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
  return `${MODEL_PRIMER}\n\n${COMPOSER_RULES}\n\n${shapes}`;
}

/**
 * Concise body for the shared module (B) composed into orchestrators — the rules
 * plus a pointer to the MCP \`describe\` tool (C) for the exact per-kind shapes,
 * so orchestrator prompts stay lean while the full detail is fetched on demand.
 */
export const CONVENTIONS_MODULE_BODY = `${MODEL_PRIMER}\n\n${COMPOSER_RULES}\n\nFor the exact creation shape of each kind (module/agent/flow + the kind-specific fields), call the composer MCP \`describe({ kind })\` — and \`get\` an existing definition as a working template.`;
