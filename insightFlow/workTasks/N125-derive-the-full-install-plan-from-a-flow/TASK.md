# N125 — Derive the full install plan from a flow

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Installing what a flow needs (MCP servers, hooks, skills) is partial: the project `install` list + emitter exist (N96), but nothing derives the FULL artifact set a flow implies (every mcp/hook/skill module its agents contribute, plus the install list). The install UI (N127) needs that plan.

## Goal

1. Given a flow, collect ALL installable artifacts: every `mcp-server`/`hook`/`skill` module contributed by its agents PLUS the project `install` list, into an ordered, de-duplicated install plan.
2. `GET /api/flow-install-plan?id=<flowId>` returns the plan with targets (`.mcp.json`, `.claude` hooks, skills, settings) and per-item kind/source.
3. Reuses `collectArtifacts` / the N96 emitter (bundle-aware via N95).
4. Read-only — computes the plan, installs nothing.

## Scope

### In scope

- `packages/taskflow/src/agents/` — a `flowInstallPlan(flow)` collecting agent module artifacts + install list (dedup by target).
- `dashboard/server/index.ts` — `GET /api/flow-install-plan`.
- Tests: a flow with mcp+hook+skill agents → plan lists each once with correct targets; install-list items included; empty flow → empty plan.

### Out of scope

- Executing the install (N126). The UI (N127).
- New artifact kinds beyond mcp/hook/skill/settings.

## Implementation plan

1. **Collect** — walk the flow's agents → their non-text modules (mcp/hook/skill) via `resolveModules`/`collectArtifacts`; add `install` list; dedup by target id.
2. **API** — `GET /api/flow-install-plan?id=`.
3. **Tests** — plan composition + dedup + empty.

## Verification

- `pnpm build` + suite green; the default flow's plan lists its hooks/mcp/skills; a custom flow's plan matches its agents+install.
- Plan is deterministic + deduped.

## Notes

- Feeds N126/N127. Reuses N95/N96 emitter. See N119/ANALYSIS.md.
