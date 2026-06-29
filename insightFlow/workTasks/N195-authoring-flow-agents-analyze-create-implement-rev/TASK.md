# N195 — Authoring flow agents — analyze/create/implement/review/fix/human-review/test/install

**Type:** feat
**Priority:** high
**Created:** 2026-06-26

## Problem

The authoring flow (N194) needs its **agents** — a lifecycle that designs and builds custom modules/agents/flows. They mirror the default lifecycle's shape but are specialized for *authoring composer definitions* (not code), and must carry insight-flow's standard baseline.

## Goal

1. Ship the composed agents for the authoring flow: **analyze · create · implement · review · fix · human-review · test · install**.
2. Each is baseline-composed (**security + enforcement + protocol + activity**) like every shipped agent.
3. Wire the handovers (with N189 `when` intent) including the **gated `create → analyze`** re-entry and the **`install`-after-approval** step.

## Scope

### In scope

- **8 composed agents** (built-in, `src/agents/composed/*.json` + role modules under `src/agents/modules/roles/`):
  - **analyze** — clarify intent; **ask whether the user wants the activity engine** (and other opt-ins) in their generated agent/flow; produce a design brief. Entry agent.
  - **create** — the composer-taskmaster: write the authoring spec (what defs to build + design). If invoked directly, **gated** handover to analyze first.
  - **implement** — author the JSON defs via the composer MCP `create_module/create_agent/create_flow` (handovers/relationships authored within agent/flow defs).
  - **review** — AI review of the authored defs (schema, dedup/reuse, best practice); `fix-needed` → fix; else → human-review.
  - **fix** — apply review blockers.
  - **human-review** — human gate; approval → install.
  - **test** — validate the authored defs (load/compose/install dry-run).
  - **install** — install the approved flow/module/agent via the composer MCP `install`; sequenced after approval.
- **Baseline** on every agent: `security`, `enforcement`, `protocol`, plus `activity` (the standard cross-cutting set).
- **Handovers** as edge/module handovers with `when` reasons (N189): analyze→create, create→implement, implement→review (auto), review→fix / review→human-review (gated, 1-of-N by `when`), fix→review, human-review→test/install (gated), test→install, install→done; plus the gated create→analyze.
- Each agent declares its **subagents** set (N191) — ids supplied by N196 (this task wires the field; N196 ships the subagent modules).

### Out of scope

- The flow definition/skeleton (N194) and subagent modules (N196).
- The MCP install module + stdio docs (N197).
- Editing the default flow / its agents.

## Implementation plan

1. **Role modules** — author per-agent `section` modules (identity, contract, overrides) under `modules/roles/` for the 8 agents; register in `MODULE_REGISTRY`.
2. **Composed agents** — assemble each from baseline + role modules + handovers (+ `subagents` field referencing N196 ids); register in `COMPOSED_AGENTS`.
3. **Handovers** — author the handover modules/edges with `when` intent + auto/gated modes; the gated create→analyze; install-after-approval.
4. **Activity opt-in** — analyze agent prompts the user about the activity engine (+ other opt-ins) for the generated artifact.
5. **Role-file sync** — run `prompt-build --compose --apply` + `sync-role-templates.mjs` so generated `*_ROLE.md` + templates stay drift-guard-clean.
6. **Tests** — agents compose, baseline present, handovers render with `when`, drift guard passes.

## Verification

- The 8 agents resolve + compose; each includes security/enforcement/protocol/activity; handovers render with `when` (incl. gated create→analyze + install-after-approval).
- Drift guard (`compose.test`) passes after re-sync.
- `pnpm --dir packages/taskflow test` + `tsc` + `lint` green.

## Notes

- Depends on **N194** (flow skeleton to wire agents into); `subagents` ids land with **N196**.
- Decision trail: this folder's `ANALYSIS.md` + N194's.
- Scope guard: this is the largest ticket — if it grows unwieldy, split the lifecycle into authoring-core (analyze/create/implement) + authoring-review (review/fix/human-review/test/install) as a follow-up.
