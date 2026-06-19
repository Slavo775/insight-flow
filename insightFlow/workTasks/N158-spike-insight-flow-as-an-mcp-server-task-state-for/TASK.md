# N158 — SPIKE: insight-flow as an MCP server (task-state for any agent)

**Type:** chore
**Priority:** medium
**Created:** 2026-06-18

## Problem

- **RESEARCH SPIKE — no production code.** Supporting multiple agent runtimes (Claude, Cursor, and potentially hermes/OpenHands) risks N bespoke integrations. Exposing insight-flow's task state + lifecycle as an **MCP server** would let ANY MCP-capable agent read "current task / next step / spec" and update status through ONE integration — the highest-leverage path for the runtime category. This spike decides whether to build it.

## Goal

1. A decision doc proposing the MCP **tool surface** (names, inputs/outputs) for task-state access + mutation.
2. A clear story for reusing the existing core (no duplicated lifecycle logic) + auth/scope.
3. A go/no-go recommendation with a minimal first-cut shape if "go".

## Scope

### In scope (research only — write findings into ANALYSIS.md / a decision doc; do NOT ship code)

- Propose the MCP tool list, e.g.: `get_current_task`, `next_step` (reuse `suggestNextSteps`), `show_spec` (TASK.md/CHECKLIST.md), `list_tasks`, `set_status`/`advance` (reuse `set-status.ts` flow-validated setter), `create_task`.
- How it reuses core: `core/storage.ts`, `core/set-status.ts`, `core/flow-status.ts`, the existing `mcp-server` module kind + emitter (`agents/emit.ts`) and `collectArtifacts` — i.e. could insight-flow EMIT its own MCP-server config so installs wire it automatically.
- Transport/auth/scope: stdio vs HTTP MCP; read-only vs mutating tools; project-root resolution; how it coexists with the dashboard server.
- Relationship to N157 (observability) and N159/N160 (the runtimes that would consume it).

### Out of scope

- No production MCP server implementation, no new dependency added. (That's a follow-up task if the spike says "go".)
- No change to existing behavior.

## Research plan

1. **Survey** the MCP server SDK options for Node/TS + how the existing `mcp-server` module kind/emitter already models MCP config.
2. **Design** the tool surface mapping each to an existing core function (note any gap that would need new core API).
3. **Decide** transport + auth + scope (read-only default? mutation gated?).
4. **Write the decision doc**: proposed tools, reuse map, risks, and go/no-go + a minimal PoC shape.

## Verification

- Deliverable exists: a decision doc (this folder's ANALYSIS.md or a RESEARCH section in REVIEW.md) covering tool surface, reuse, auth, and a go/no-go.
- No source/test changes committed (it's a spike).

## Notes

- Source: /task-analyze evaluation (MCP is the unifying vector across Claude/Cursor/hermes/OpenHands). Ties to N160 (hermes via MCP) and N159 (OpenHands). Independent; spike output informs whether the runtime tasks proceed.
