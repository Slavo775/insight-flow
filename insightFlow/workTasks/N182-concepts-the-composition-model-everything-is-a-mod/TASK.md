# N182 — Concepts: the composition model (everything-is-a-module, agents, flows, handover)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- The 2.0 "everything is a module" composition system is insight-flow's core mental model, but it is **undocumented as concepts**. The site's `concepts/` section (created in N181) has only a stub "How it works" landing. Users see commands and a dashboard with no explanation of *why* modules → agents → flows fit together.

## Goal

1. Fill the `concepts/` section (website/docs/concepts/) with the understanding-oriented explanation of the composition model.
2. Explain the atomic hierarchy: **Module → Agent → Flow**, and how a task binds to a flow.
3. Explain the module kinds and "behavior as data" (handover / status-transition).
4. Explain the **handover system** (module-level vs flow-edge; auto vs gated).
5. Keep it conceptual (the *why*); link to Reference (N183) for the *what* and Guides (N184) for the *how*.

## Scope

### In scope

- Author concept pages under `website/docs/concepts/` (replace/expand the N181 stub outline). Suggested pages (sidebar_position order):
  1. `index.md` — "How it works" overview (expand the existing landing into the real mental-model intro + the Module→Agent→Flow diagram).
  2. `modules.md` — "Everything is a module": the 8 kinds (`section`, `include`, `mcp-server`, `hook`, `skill`, `bundle`, `handover`, `status-transition`); text vs artifact vs behavior-as-data; locked modules (`security`/`enforcement`/`protocol`, and locked-by-kind).
  3. `agents.md` — "From modules to agents": an agent = an ordered list of module ids composed into one role prompt; bundles expand; the JSON-in-`src/agents/composed/` → generated `*_ROLE.md` drift-guarded relationship.
  4. `flows.md` — "Flows & the lifecycle": a flow = `agents[] + edges + install[] + statuses[] + entryAgents`; how a task binds via `Task.flowId` and `flows.byType`/`defaultFlow`.
  5. `handover.md` — "The handover system": module-level handovers (the lifecycle chain, `to`/`on`/`mode`) vs flow-edge handovers (N147); auto vs gated.
- Each page: conceptual prose + small diagrams (ASCII/mermaid ok). Ground every claim in the code (cite types/files, e.g. `src/core/schema/index.ts` module schema, `src/agents/compose.ts`, `src/core/flow-status.ts`).
- Cross-link to Reference (N183) and Guides (N184) where readers want the inventory or the how-to.
- Update `concepts/_category_.json` only if needed (it exists from N181).

### Out of scope

- The **default inventory** (which modules/agents ship, the master server) — that is Reference, **N183**.
- **How-to** recipes (authoring/installing custom modules/agents/flows) — that is **N184**.
- The **dashboard** UI guide — **N185**.
- Any source-code change; this is docs only.
- Auto-generating concept pages from code.

## Implementation plan

1. **Re-read the source** to keep claims accurate: `src/core/schema/index.ts` (AgentModuleSchema — the 8 kinds), `src/agents/compose.ts` (resolveModules, composeAgent, collectArtifacts), `src/core/flow-status.ts` + flow schema (Project type), `src/core/locked.ts` (locked modules), `src/agents/modules/handovers.json` (the handover chain).
2. **Write `index.md`** — the mental model + Module→Agent→Flow diagram (expand the N181 stub).
3. **Write `modules.md`, `agents.md`, `flows.md`, `handover.md`** in that dependency order.
4. **Diagrams** — a simple Module→Agent→Flow diagram and a lifecycle/handover-chain diagram.
5. **Cross-link** to N183 (inventory) and N184 (how-to) and existing `flow/` + `agents/` pages.
6. **Build** — `pnpm --dir website build` clean (no broken links/anchors); verify pages appear under Concepts.

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- Concepts section shows the 5 pages in order; mental-model diagram renders.
- Spot-check claims against source: module kinds count (8), locked module ids (`security`/`enforcement`/`protocol`), handover modes (`auto`/`gated`).
- `npx prettier --check` passes on new files.

## Notes

- Part of the documentation program: N181 (IA + versioning) ✅ → **N182 (Concepts, this)** → N183 (Reference inventory) → N184 (Guides how-to) → N185 (Dashboard).
- Grounded surface (from analysis): 8 module kinds; ~80 shipped modules; 10 composed agents; default flow = 10 agents / 13 edges / 15 statuses; handover chain in `handovers.json`.
- This is the **conceptual spine** — write it first so Reference/Guides/Dashboard can link back to it. See `ANALYSIS.md` for the full surface map.
