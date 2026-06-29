# N197 — Authoring flow ↔ composer MCP wiring (mcp-composer install + stdio usage) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/authoring-flow`)
**Verdict:** approved

## Summary

`mcp-composer` added to the authoring flow's `install`, a shared `composer-mcp-note`
(stdio: nothing to start/stop; tools-missing → install `mcp-composer`) composed
into all 8 agents, `command:{install:true}` so the agents emit as commands, and
docs. Verified end-to-end. **Approved.**

## Checklist verification

- [x] `mcp-composer` in the flow `install` → installing the flow writes the `composer` entry to `.mcp.json` — pass (verified)
- [x] Shared stdio guidance composed into the authoring agents — pass (`## Composer MCP` present in the emitted commands)
- [x] No HTTP/agent-managed lifecycle introduced (stdio only) — pass
- [x] Docs note the stdio lifecycle + the authoring-flow ↔ MCP relationship — pass (composer-mcp docs; site builds)

## Blockers

None.

## Non-blocking

- The MCP `update_*` tool description is stale re: built-in flows (recorded under N194 — one-line fix).

## Security & edge cases

- stdio only; no server lifecycle for agents to manage. Install is reference-safe (N174).

## Notes

End-to-end verified: installing `composer-authoring` emits 8 agent commands + 3
subagents + the `composer` `.mcp.json` entry, each command carrying its
`## Subagents` + `## Composer MCP` sections. See N194's REVIEW for the batch.
