# N188 — Analysis (pre-taskmaster strategist trail)

## Problem framing

The user proposed a broad bundle: (1) a new default flow for *creating* custom modules, (2) a "documentation agent" to keep docs current, and (3) a small MCP server exposing module/agent/flow operations, runnable via CLI with a new config port prop. Naming for the MCP was open ("mcp is not the right name").

Codebase exploration reframed this sharply:

- The composer model (modules/agents/flows, built-in + custom) is **already fully built**, with Zod schemas, a merged registry, and **full CRUD over HTTP** (`custom-defs.ts`, `/api/install-plan`, `/api/install`, SSE). The dashboard calls this surface the **"composer."**
- MCP is already a *module kind* insight-flow **writes into** a consumer's `.mcp.json`, but insight-flow **runs no MCP server** and has **no MCP SDK dependency**.
- Docs are Docusaurus with partial auto-gen (`sync-docs.mjs`).

Key insight: the requested MCP tools mirror the existing composer HTTP API almost 1:1 — so this is a **new transport over existing logic**, not new capability. That de-risks it and makes "thin facade, no logic duplication" the load-bearing constraint.

## Goal

Expose the composer registry (modules/agents/flows, built-in + custom) as agent-callable MCP tools over stdio, preserving all existing safety semantics, plus a dogfooded built-in install module and full docs/README coverage.

## Options considered & decisions

- **Decomposition:** MCP server / authoring flow / documentation agent are ~3 tasks. → **Decision: build the MCP server first** (foundation); the other two are follow-ups. Documentation agent and authoring flow are explicitly out of scope here.
- **Transport:** stdio (no port) vs HTTP/SSE (port) vs both. → **stdio only.** The user's initial "config port prop" instinct was dropped; stdio is the standard Claude Code local-tool pattern, no auth surface, registered as a `.mcp.json` command.
- **Naming:** `customization` vs `authoring` vs `composer`. → **`composer`**, matching existing codebase vocabulary.
- **Tool granularity:** fine-grained (verb × kind, ~18) vs kind-parameterized (~6, union schemas) vs hybrid. → **Hybrid (~12):** kind-parameterized `list`/`get`/`install`/`uninstall`/`delete`; per-kind `create_*`/`update_*` for precise schemas.
- **Edit scope:** custom-only vs full parity. → **Full parity** — editing a built-in ejects/overrides; locked modules + `default` flow refuse; revision-aware (N111).
- **Delete vs uninstall:** → **both**, kept distinct (uninstall removes emitted artifacts; delete removes the custom def). Both reference-safe (409 on referenced).
- **Install autonomy:** read+create-only vs gated vs fully autonomous. → **Fully autonomous** (no human gate), but bounded by existing locked-module enforcement + `.mcp.json` undo snapshots (N172).
- **Built-in install module:** → ship an `mcp-server`-kind built-in (suggested id `mcp-composer`, ejectable, not locked) so the module system installs the MCP itself.
- **Docs placement:** guide page vs dedicated section. → **Dedicated top-level Docusaurus section**, "Next" version only. **READMEs:** **all** (package npm funnel + repo-root).

## Open questions / risks

- **Autonomous install of hook-bearing modules** wires shell commands into the environment with no human gate — accepted by the user; mitigated by locked-module enforcement + N172 undo. Bake undo/snapshot in as non-optional.
- **Module id `mcp-composer`** is a suggestion; taskmaster/implementer may finalize to avoid collision with a future `composer` agent/flow id.
- First server-side MCP dependency (`@modelcontextprotocol/sdk`) in an otherwise dep-disciplined codebase — keep the facade thin.

## Sources

- Codebase exploration (2026-06-25): `src/agents/` (compose, project, modules, user-registry), `src/core/` (schema, types, locked), `src/dashboard/server/custom-defs.ts` + install endpoints, `src/cli/cli.ts`, `website/` (Docusaurus + `sync-docs.mjs`).
- Related tasks: N111, N119, N147, N156, N172, N173, N180, N181–N187.

## Handoff brief

Built into TASK.md / CHECKLIST.md of this folder. Scope: stdio `composer` MCP server (`insight-flow mcp`) with ~12 hybrid tools as a thin facade; `mcp-composer` built-in install module; dedicated docs section + all READMEs. Out of scope: authoring flow, documentation agent, HTTP transport/port.
