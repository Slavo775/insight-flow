# N158 — SPIKE decision doc: insight-flow as an MCP server

**Status:** research complete · **Recommendation: GO** (build as a follow-up `feat`; it's the shared substrate for N159/N160).

## Question

Can we expose insight-flow's task state + lifecycle as one MCP server so any MCP-capable agent (Claude Code, Cursor, hermes, OpenHands) reads "current task / next step / spec" and updates status through a single integration — instead of N bespoke runtime integrations?

## Finding

Yes, cleanly. Every needed operation already exists as a pure-ish core function; an MCP server is a thin adapter over them. The official **`@modelcontextprotocol/sdk`** (Node/TS) provides `McpServer` + `registerTool(name, schema, handler)` and both `StdioServerTransport` (local, per-editor) and `StreamableHTTPServerTransport` (shared/remote). insight-flow already ships an `mcp-server` **module kind** + the artifact emitter (`agents/emit.ts`), so a flow can *install* the MCP-server config automatically into a consumer's `.mcp.json` — the wiring story is already half-built.

## Proposed tool surface

Read:
- `get_current_task` → reuse `resolveId(master)` + `loadTaskById` (storage.ts); returns lean Task.
- `list_tasks` → shard read (storage); filter by status/type.
- `show_spec {id}` → TASK.md / CHECKLIST.md (+ REVIEW.md) from the task folder.
- `next_step {id}` → reuse `suggestNextSteps(flow, status, states)` (flow-status.ts) — the flow-aware "what to do next".

Mutate (gated — see auth):
- `set_status {id, status}` → reuse the flow-validated `setStatus` / `writeStatus` (set-status.ts/status-write.ts) — never bypasses validation.
- `advance {id, agent}` → reuse the N133 `advance` path (transitions.ts) for handover/status-transition.
- `create_task {title,type,priority,tags}` → reuse the `create` CLI core.

Each tool maps 1:1 to an existing core function — **no duplicated lifecycle logic**. (Gap noted: a couple of CLI commands wrap logic in `cli/commands/*`; minor extraction into `core` may be needed so the MCP server doesn't import the CLI layer.)

## Transport / auth / scope

- **Default stdio, read-mostly.** Ship a `insight-flow mcp` subcommand exposing the read tools over stdio (what editors expect); mutating tools behind an explicit opt-in flag/config (`mcp: { allowMutations: false }`), consistent with the tech-agnostic + explicit-consent posture.
- Project-root resolution reuses `resolveProjectRoot()`; coexists with (does not replace) the dashboard server.
- HTTP transport is a later option for shared/remote (OpenHands/hermes) consumers.

## Relationship to the round

- **N159 (OpenHands)** and **N160 (hermes)** both speak MCP → this server is their cleanest integration vector. **N158 should land before/with them.**
- Independent of N157 (Langfuse, observability).

## Go/no-go

**GO** — highest leverage of the runtime category, low-risk (thin adapter over existing core), reuses the existing `mcp-server` emitter. Recommend a follow-up `feat` task: `insight-flow mcp` (stdio, read tools first; mutations opt-in), exported MCP config via the emitter. Effort: small–medium.

## Sources

- `@modelcontextprotocol/sdk` (MCP TS SDK: McpServer, registerTool, stdio/HTTP transports).
- insight-flow core: `core/flow-status.ts` (`suggestNextSteps`), `core/set-status.ts` (`setStatus`), `core/storage.ts` (`loadTaskById`/`resolveId`), `core/config.ts` (`getWorkDir`), `agents/emit.ts` + the `mcp-server` module kind.
