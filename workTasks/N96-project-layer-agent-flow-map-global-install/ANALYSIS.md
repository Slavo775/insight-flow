# N96 — Project layer — agent flow map + global install — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

Human's atomic-design vision (2026-06-11, verbatim core): *"we need another layer (project layer) where user define the relations between the agents how should flow looks like and also install some global things … modules hold the smallest parts … atoms, the agents layer … molecules, and we will have the top layer product layer where we build all product."* Two real gaps it names: (1) the agent-to-agent flow exists only implicitly (status machine + pickers + prompt prose — invisible, unauditable); (2) project-level installs have no honest home — N94's `ACTIVITY_AGENT` is a pseudo-agent stopgap. The analyzer's key design concern, accepted by the human: the **"fourth copy" drift risk** — flow data describing behavior enforced elsewhere will rot unless (a) triggers are validated against the real status enum and (b) the descriptive→prescriptive trajectory is pinned.

## Goal

- The flow visible as validated data + interactive map; installs as project data (pseudo-agent dissolved); contract: descriptive now, prescriptive in a later iteration.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Project layer: validated flow + install, read-only map (chosen) | Honest taxonomy; flow auditable; installs data-driven; foundation for customization + future prescriptive flip | Flow data is a (validated) second description until the flip | M |
| B — Install-only "profile" (analyzer's first sketch) | Smaller | Ignores the relations half the human explicitly asked for | S |
| C — Prescriptive immediately (pickers read the flow now) | No descriptive interlude | Rewires next/state machine in the same task as a new schema + UI — too much blast radius at once | L |

## Decision

- Chosen: **A** (human-confirmed, including the staged descriptive→prescriptive contract). Layer naming "project" over "product" (per analyzer recommendation; the human used both).

## Open questions

- [non-blocking] Manifest bucket id: keep `activity` (no migration) vs rename to the project id (cleaner; adoption logic protects against duplicates). Implementer decides, documents.
- [non-blocking] Flow edge granularity: agent→agent with `on` triggers vs status-node graph. Spec assumes agent-nodes + trigger-labeled edges (matches the dashboard mental model); revisit when prescriptive.
- [non-blocking] Reserve a `targets` field (claude/cursor) in `ProjectSchema` now? Reserve-but-unimplemented is cheap; implementer may add as optional with a comment.
- [non-blocking] `referencedBy` semantics for install ids (modules show "installed by project: default")? Nice-to-have.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, 2026-06-11, trust: high):
- `packages/taskflow/src/agents/compose.ts` — `ACTIVITY_AGENT` (the stopgap this dissolves).
- `packages/taskflow/src/core/types.ts` / `schema/index.ts` — the status/verdict unions the triggers must reuse.
- `packages/taskflow/src/cli/cli.ts` (`next`/`next-review`/`next-fix` pick orders) + the 9 role prompts' handoff prose — the implicit flow being made visible.
- N93 dashboard (`SideLayout`, `CompositionMap`) — the rendering substrate.

## Handoff brief

> Title: Project layer — agent flow map + global install (atomic design top layer) · Type: feat · Priority: medium · Tags: project, composer, dashboard, flows.
> `ProjectSchema` { agents, flow edges with status/verdict-validated triggers, install (bundle-aware ids) } + shipped `project/default.json` (current lifecycle incl. change-request/incident side-flows). `install` absorbs the activity hooks (ACTIVITY_AGENT dissolves); init/migrate-hooks apply via the emitter. Read-only `/project` page with interactive flow map + install panel; `/api/project`. Descriptive this iteration, prescriptive later. Implement after N95.
