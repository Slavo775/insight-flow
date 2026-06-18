# N147 — edge-level handover on ProjectFlowEdge (project-scoped, trigger-independent)

**Type:** feat
**Priority:** high
**Created:** 2026-06-18

## Problem

- After the N142–N146 round, handover is authored as a separate agent module while flow edges are a separate diagram — a two-step model that orphans easily. The owner wants handover to be a property of the **relation/edge** itself: when wiring two agents you choose "status change" or "handover", and a handover edge generates the source agent's `## Handover` section (auto/gated). This task lays the data foundation.
- The edge-level handover must be **project-scoped** (stored on the flow edge, not the shared agent) so it works even when the source is a built-in/locked agent (e.g. Taskmaster) without mutating the global agent. Trigger (`on`) and `handover` are **independent** — a relation may be a plain status-change, a pure handover, or both.

## Goal

1. `ProjectFlowEdgeSchema` gains an optional `handover: { mode: "auto" | "gated" }` (default `gated`), independent of `on`.
2. The `FlowEdge` type (core) and the client `ProjectDto.flow` type carry `handover?`.
3. Back-compat: edges without `handover` validate and behave exactly as today.
4. Foundation merged so N148 (picker), N149 (install composition), N150 (diagram) can build on it.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — add `handover: z.object({ mode: z.enum(["auto","gated"]).default("gated") }).optional()` to `ProjectFlowEdgeSchema` (line ~429), alongside `from/to/on?`. No new referential constraints (the per-project superRefine still only validates `on`).
- `packages/taskflow/src/core/flow-status.ts` — extend the `FlowEdge` interface with `handover?: { mode: "auto" | "gated" }`.
- `packages/taskflow/src/dashboard/client/api.ts` — extend `ProjectDto.flow[]` element type with `handover?: { mode: "auto" | "gated" }`.
- `packages/taskflow/test/` — a schema test asserting an edge with `handover` parses (mode defaults to `gated`) and an edge without it still validates.

### Out of scope

- No UI (N148), no install composition (N149), no diagram rendering changes (N150).
- Do NOT touch the N142 agent-level `handover` module kind or the canonical global handovers — they stay as-is (kept global per the analysis).
- No change to `on`/trigger semantics or status writes.

## Implementation plan

1. **Schema field.** In `ProjectFlowEdgeSchema`, add the optional `handover` object with `mode` enum (default `gated`). Mirror the comment style of the surrounding N110/N112 notes; document that `on` and `handover` are independent.
2. **Core type.** Add `handover?: { mode: "auto" | "gated" }` to `FlowEdge` in `flow-status.ts`.
3. **Client DTO.** Add the same optional field to `ProjectDto.flow` in `api.ts`.
4. **Tests.** Add schema parse cases (with/without `handover`, default mode) — co-locate with the existing project/flow schema tests (e.g. `flow-statuses.test.mjs` or a new `flow-edit`/schema test).
5. **Verify** (below).

## Verification

- `pnpm --dir packages/taskflow run typecheck` (package + client) clean.
- `pnpm --dir packages/taskflow test` passes incl. the new schema cases.
- `ProjectSchema.parse` accepts a flow edge `{ from, to, on: "ready", handover: { mode: "auto" } }` and one with no `handover`; `handover.mode` defaults to `gated` when the object is present without `mode`.

## Notes

- Round "edge-authored handovers" — follow-up to N142–N146. Sequence: **N147 → (N148 ∥ N149) → N150**.
- Decision (from ANALYSIS.md): edge handover is project-scoped + trigger-independent; canonical handovers stay global on agents (N142 untouched).
