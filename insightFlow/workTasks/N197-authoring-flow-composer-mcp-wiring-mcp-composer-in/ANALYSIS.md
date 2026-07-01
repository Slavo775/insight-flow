# N197 — Analysis (pre-taskmaster strategist trail)

> Part of the authoring-flow initiative (N194–N197). Full shared trail: **N194's ANALYSIS.md**.

## Problem framing

The authoring agents/subagents act *through* the composer MCP. The user initially
wanted agents to start/stop/recover the MCP server. But the composer MCP is
**stdio** (N188) — it has **no running state**: the harness spawns `insight-flow
mcp` per session and tears it down at session end. So the lifecycle requirement
collapses to "ensure the `composer` server is registered in `.mcp.json`."

## Goal

Make installing the authoring flow register the composer MCP (`mcp-composer`),
have the agents call its tools, and document the stdio lifecycle (no start/stop/
recover) + a "tools missing → install `mcp-composer`" recovery note.

## Decisions

- **stdio, no lifecycle management** (user confirmed: "less token, just use the
  stdio server"). An HTTP/SSE MCP (to enable agent-managed start/stop) is rejected
  — it reverses N188.
- **Registration is the only precondition** — add `mcp-composer` (N188 built-in)
  to the authoring flow's `install` list; if a tool call fails, the remedy is
  installing that module, not "starting a server."

## Open questions

- Whether to put the MCP guidance in a shared `section` module or fold it into each
  agent's role module (N195) — coordinate with N195.

## Sources

- N188 (composer MCP stdio + `mcp-composer` module), N194 (flow `install` list).
  Shared trail: N194's ANALYSIS.md.

## Handoff brief

In TASK.md/CHECKLIST.md: add `mcp-composer` to the authoring flow `install`; add a
shared guidance section (composer tools via stdio MCP; tools-missing → install
recovery; no server lifecycle); document in the docs. Small; depends on N194 +
N195.
