# ANALYSIS — Handover feature (round N142–N145)

_Pre-taskmaster strategy record. Covers the whole 4-task round; N142 is the foundation task._

## Problem framing

The user asked for two things: (1) a "non-editable module/section" that tells an agent what status to set when it finishes, transitionable to multiple states by intent; and (2) a new **Handover** transition for agent-to-agent communication — editable in both agent and flow create/edit, with two modes (with explicit user approval / without), CRUD-able, and multiple-per-intent (e.g. analyze→taskmaster needs approval; every implementer→task-git is automatic).

Grounding in the codebase revealed **~80% already exists**:
- The "non-editable status module" is the **`status-transition` module kind (N128)** — `{agent, sets, from?}`, consumed by `insight-flow advance` (`agents/transitions.ts`, `cli/commands/advance.ts`), rendered into prompts by `compose.ts:227` (`transitionSection`). Canonical ones are **LOCKED**, and a read-only locked tier already exists in the UI (`ModuleForm.tsx:312`).
- "Handover" is the **flow edge** `{from,to,on}` (`core/flow-status.ts`) — already full-CRUD in `FlowEditor`, already supports multiple branches per trigger and trigger-less "direct handoff on human go-ahead" (analyze→taskmaster).

The genuine gaps: no **mode** (auto/gated) on handovers; status-transition/handover not **creatable in the UI**; no agent-level handover surface; no mechanism for **which** handover fires.

## Goal

A first-class, agent-owned `handover` concept with auto/gated modes, surfaced and CRUD-able in the editors, with the flow diagram kept honest — without flipping the deliberately-descriptive flow model prescriptive.

## Options considered (and the decisions)

1. **Drive vs document** → **Document + guide (keep descriptive).** Nothing in the system orchestrates; handover is data the agent reads and acts on from its prompt. (Rejected: prescriptive enforcement — the project explicitly deferred it and it collides with the human-in-the-loop harness + `AgentGitPermissions`.)
2. **What "auto (without user)" means** → **Chain the next slash-command in-session.** The finishing agent invokes the next agent's command directly. `gated` = stop for explicit human go-ahead. Consistent with "descriptive" because it's the agent honoring its prompt, not an orchestrator.
3. **Source of truth (handover editable in both editors)** → **Both store independently.**
4. **Precedence when they disagree** → **Agent wins.** The agent's declared handovers are authoritative; the flow diagram is non-binding (and can drift → N144 keeps it honest).
5. **Choosing among multiple outcomes** → **Agent free-picks in prompt.** The prompt lists candidates; the agent uses judgment. (No new first-class "intent" data model.)

## Decision

Implement handover as a new **`handover` agent-module kind** mirroring `status-transition`: `{kind:"handover", to, on?, mode:"auto"|"gated" (default gated), label?}`. Agents are authoritative; flow editor is a non-binding diagram with honesty cues. Default `gated`; `auto` is opt-in and never bypasses `AgentGitPermissions`/consent. Sliced into 4 tasks:

- **N142** — `handover` module kind: schema + compose render + locked canonical set (foundation).
- **N143** — surface `status-transition` + `handover` in ModuleForm/AgentForm (CRUD, locked read-only).
- **N144** — flow-diagram honesty: auto/gated badges + orphan-edge warnings.
- **N145** — prompt wiring: auto-vs-gated language + in-session chaining + safety guardrails.

## Open questions

- Cycle handling for `auto` back-edges (review ↔ review-fix): exact rule (cap hops vs force-gate on a back-edge) — finalized in N145's prompt language.
- Whether N143 needs the project DTO extended to expose resolved agent handovers, or the client registry already has them (resolved during N144 implementation).
- The "task-git split into commit-only/push-only agents" idea was raised but scoped OUT — representable today via multiple agents + `AgentGitPermissions`; revisit separately if desired.

## Sources

- `core/flow-status.ts` (FlowEdge, suggestNextSteps), `core/set-status.ts` (N131 setter), `core/statuses.ts`.
- `core/schema/index.ts` (`AgentModuleSchema` status-transition member ~:356, `deriveCommandName` :384, `ProjectSchema` :463).
- `agents/compose.ts` (`transitionSection` :227, `composeAgent`), `agents/transitions.ts`, `cli/commands/advance.ts`, `agents/user-registry.ts` (locked tier), `agents/project.ts`.
- `dashboard/client/ModuleForm.tsx` (KINDS :145, locked mirror :157/:312), `AgentForm.tsx`, `components/FlowEditor.tsx` (:215 toReactFlowEdge), `components/FlowMap.tsx`, `components/CompositionMap.tsx` (kindColor).
- `core/types.ts` (`AgentGitPermissions` :347).

## Handoff brief

4-task feat round (N142 high, N143–N145 medium), tags `handover` + per-task. Build order: N142 → (N143 ∥ N144) → N145; N143/N144/N145 all depend on N142, N144 also benefits from N143. Keep diffs minimal, mirror the `status-transition`/locked-tier patterns, do not make the flow prescriptive, default mode `gated`.
