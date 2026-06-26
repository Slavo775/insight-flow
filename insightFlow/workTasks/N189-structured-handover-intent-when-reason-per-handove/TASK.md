# N189 — Structured handover intent — when/reason per handover candidate

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

When an agent has several handovers ("1-of-N branch"), `handoverSection` (`packages/taskflow/src/agents/compose.ts:335`) renders them as a bullet list and the agent "free-picks the one matching its outcome." But the only structured discriminator is the `on` status — the *reason* to choose a branch (e.g. "hand to documentation **when** the change is user-facing, else to task-git") lives only in prose, isn't authored as data, and can't be shown in the flow graph. Branch picks are therefore unreliable and unauditable.

## Goal

1. Add an optional, human-readable `when`/reason to each handover (flow edge + handover module).
2. Render it into the agent's `## Handover` section at install so the source agent has an explicit decision criterion.
3. Surface it in the flow editor so the branch reason is visible/editable, not buried in the prompt.

## Scope

### In scope

- **Schema:** add optional `when` (string) to the handover shape in `ProjectFlowEdgeSchema` (`handover`) and the `handover` module kind (`AgentModuleSchema`), `packages/taskflow/src/core/schema/index.ts`.
- **Flow status:** carry `when` on `FlowEdge.handover` and `AgentHandover` (`core/flow-status.ts`); thread through `flowHandoversByAgent` (`agents/flow-install.ts`).
- **Rendering:** `handoverSection` (`compose.ts`) renders the reason per candidate (single + multi forms), e.g. `- \`<to>\` when <when> (<mode>) — <action>`.
- **Flow editor:** show/edit `when` on a handover edge (`dashboard/client/FlowEditor.tsx`).
- Tests: extend `flow-status` / `compose` / `flow-edit` coverage.

### Out of scope

- Parallel/fan-out and joins (those are subagents — N190/N191).
- Any *runtime enforcement* of the condition: the flow stays descriptive — the agent still decides; `when` only guides + documents the choice.

## Implementation plan

1. **Schema** — add `when: z.string().optional()` to the edge `handover` object and the `handover` module variant.
2. **flow-status** — add `when?` to `AgentHandover`; preserve it in `flowHandoversByAgent`.
3. **compose** — update `handoverSection` single + multi branches to include the reason when present.
4. **Flow editor** — input for `when` on the handover edge; persist via the existing project PUT.
5. **Tests** — a flow with two `when`-carrying handovers from one agent renders both reasons; round-trips through the editor/API.

## Verification

- A flow whose agent has two handovers with distinct `when` values composes a `## Handover` section listing each reason; the flow editor shows/edits them.
- `pnpm --dir packages/taskflow test` green; `tsc`/`lint` clean.

## Notes

- Independent of the subagent line (N190–N192); cheap, self-contained win.
- Decision trail: this folder's `ANALYSIS.md` (and the fuller thread in N190's ANALYSIS).
- Background: the four-cardinality analysis concluded the *only* genuine handover gap is branch intent; parallel/join/return are the subagent feature, and back-edges already work (gated; auto-cycles are intentionally not chained).
