# N197 — Authoring flow ↔ composer MCP wiring (mcp-composer install + stdio usage)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-26

## Problem

The authoring agents/subagents (N195/N196) do their work by calling the **composer MCP** tools (`list`/`get`/`create_*`/`install`/…). For that to work in a project, the `composer` MCP server must be **registered** in `.mcp.json`. This task wires the authoring flow to ensure that, and documents the (minimal) stdio lifecycle so the agents don't try to manage a server that doesn't need managing.

## Goal

1. Installing the authoring flow **registers the composer MCP** (`mcp-composer` module → `.mcp.json`).
2. The authoring agents' prompts call the composer tools correctly.
3. Document the **stdio lifecycle**: there is no server to start/stop (the harness spawns `insight-flow mcp` on demand and tears it down at session end) — and a graceful "tools missing → register `mcp-composer`" recovery note.

## Scope

### In scope

- **Flow install list** — add `mcp-composer` (the N188 built-in module) to the authoring flow's `install` array (N194) so installing the flow writes the `composer` entry into `.mcp.json`.
- **Agent prompt guidance** — a short shared section (a `section` module, or folded into the role modules) telling the authoring agents: the composer tools come from the `composer` MCP (stdio); if a tool is unavailable, the fix is ensuring `mcp-composer` is installed (NOT starting a server); never assume a long-running server.
- **Docs** — note in the Subagents/Composer-MCP docs (or the authoring-flow guide) that the composer MCP is stdio (harness-managed; no start/stop/recover), and how the authoring flow registers it.

### Out of scope

- Any HTTP/SSE MCP transport or agent-managed server lifecycle (explicitly rejected — stdio has no running state).
- The flow (N194), agents (N195), subagents (N196).
- Changes to the composer MCP server itself (N188, shipped).

## Implementation plan

1. **Install list** — add `mcp-composer` to the authoring flow's `install` (coordinate with N194's flow def).
2. **Guidance module** — author a small shared section the authoring agents compose, covering: tools-from-`composer`-MCP, stdio (no lifecycle), "tools missing → install `mcp-composer`" recovery.
3. **Docs** — extend the Subagents/Composer-MCP docs with the authoring-flow ↔ MCP relationship + the stdio clarification.
4. **Verify** — installing the authoring flow registers `composer` in `.mcp.json`; the guidance renders into the agents' prompts.

## Verification

- Installing the authoring flow writes `{ "composer": { "command": "insight-flow", "args": ["mcp"] } }` to `.mcp.json` (via `mcp-composer`).
- The authoring agents' composed prompts include the composer-MCP/stdio guidance.
- Docs build clean; `pnpm --dir packages/taskflow test` + `tsc` + `lint` green.

## Notes

- Depends on **N194** (flow def to add to `install`) + **N195** (agents to add guidance to). Small once those land.
- stdio decision is from **N188**; this task just makes the authoring flow depend on it correctly and documents it.
- Decision trail: this folder's `ANALYSIS.md` + N194's.
