# ANALYSIS — Program: "flows govern everything" (N119–N133, 5 epics)

## Problem framing

After N88–N118, insight-flow has a composer (modules/agents/flows), a flow editor, custom states
(aliases), and flow-bound tasks that GUIDE the next step. The human's vision notes push three steps
further: (1) DEFAULTS should be editable, not immutable; (2) a flow should be IDENTIFIED/STARTED by a
main agent; (3) statuses should be genuinely CUSTOM per flow and DRIVE the kanban + lifecycle —
"kanban built by the statuses in flows", agents transitioning through flow-defined statuses. Today
built-ins are immutable, the default flow is read-only, the kanban columns are hardcoded, and the
status enum + transitions are hardcoded across ~6 places.

## Goal

15 tasks in 5 epics, each shipping safely with the canonical default flow working throughout:
E1 editable defaults (eject/override + tiers) · E2 main-agent selection + custom slash commands ·
E3 install UI · E4 status-transitions-as-data + flow status set + dynamic kanban · E5 fully
flow-driven transitions + pickers (deepest/last).

## Options considered

1. **Editable defaults** — eject/override (copy a shipped def into insightFlow/, local shadows
   package) with a three-tier model: custom (CRUD) / default (read + eject-to-update + revert; no
   delete) / locked (read-only even ejected: security/enforcement/protocol baseline + status-
   transition modules) (CHOSEN) vs. keep built-ins immutable (rejected — the human wants to edit
   defaults). The eject model is also the engine for custom transitions (E5).
2. **Flow selection** — "both equal": main-agent-invoke binds its flow AND the N116 type→flow map
   binds by type, first-action wins (CHOSEN by the human) vs. main-agent-only vs. type-map-only.
3. **Custom statuses depth** — FULL: brand-new per-flow statuses tasks store and agents transition
   through; kanban/pickers/commands read the flow (CHOSEN by the human) vs. visual-kanban-only vs.
   aliases-only (N112). The tractable architecture (the human's own "status-transition modules"
   note): make transitions DATA (a status-transition module kind), then everything reads the
   modules — NOT a from-scratch state-machine rewrite. Staged so the default flow's status set =
   today's canonical enum (byte parity) the whole way; E5 is the final, riskiest flip.

## Decision

Build E1→E5 in order. E1 (eject/override) is the foundation everything rides on. The default flow
stays canonical and byte-identical through E4; E5 is where transitions/pickers/prompts stop
hardcoding and read the flow — approached last with hard default-parity tests. "full custom
statuses" is reached via transitions-as-data, not a rewrite.

## Open questions

- E2: a main agent that owns multiple flows — reject vs. require --flow to disambiguate (N123).
- E3: install failure semantics — best-effort-with-summary vs. abort-with-partial-report (N126).
- E5: exact default-flow graph encoding that reproduces STATUS_WEIGHT order byte-for-byte (N132).
- Per-harness (cursor) parity for custom-agent slash commands beyond the existing provider seam (N124).

## Sources

- packages/taskflow: agents/user-registry.ts (immutable built-ins, N102) · dashboard/server/
  custom-defs.ts (403 on built-ins, N103) · dashboard/client/ProjectPage.tsx (!isBuiltin edit gate,
  N108) · lib.ts COLUMNS (hardcoded kanban) · cli/commands/query.ts (STATUS_WEIGHT pickers) ·
  core/schema (TaskStatus enum, ProjectSchema/states N112) · agents/project/default.json ·
  N96 install list + emitter (collectArtifacts) · N105/N118 suggestNextSteps.
- /task-analyze session 2026-06-15 with the human (vision notes + the three settled forks).

## Handoff brief

Created N119–N133 via taskmaster on 2026-06-15, all `ready`. Priorities: E1 high (N119/N120),
rest medium, the deepest/riskiest leaves (N130/N133) low/last. Big program; default-flow byte-parity
is the safety contract on every status/picker/prompt task. This supersedes N116's type-map as the
SOLE selector (now "both equal" with main agents) and crosses the N112 "descriptive-only" line into
genuine prescriptive custom statuses — deliberately, via transitions-as-data.
