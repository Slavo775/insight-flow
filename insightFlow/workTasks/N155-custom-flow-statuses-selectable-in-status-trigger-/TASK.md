# N155 — custom-flow statuses selectable in status/trigger pickers

**Type:** feat
**Priority:** medium
**Created:** 2026-06-18

## Problem

- The status/trigger pickers offer only canonical `TASK_STATUSES`, never a custom flow's own statuses (N128 `Project.statuses`). So when authoring against a custom flow, you can't pick that flow's declared statuses (N143/N146 REVIEW.md). `FlowEditor`'s `TriggerOptions` already offers custom **states** (N112 display aliases) + canonical, but not the flow's **statuses**; `ModuleForm`'s `sets`/`on`/`from` pickers offer canonical only.

## Goal

1. Where a flow context exists, the picker offers the flow's full status universe (canonical ∪ the flow's `Project.statuses` + custom `states`), not just canonical.
2. Canonical statuses remain available everywhere (no regression).
3. The global-module case (no single flow) has a defined, minimal behavior (documented).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — extend `TriggerOptions` to also list the project's `statuses` (N128) for the current flow (the project is in scope here), grouped/labelled, alongside the existing custom-states + canonical groups.
- `packages/taskflow/src/dashboard/client/ModuleForm.tsx` — the `status-transition`/`handover` field pickers (`sets`/`on`/`from`): decide + implement the minimal flow-aware behavior (see Open question).
- Source the flow statuses from the already-loaded project/registry data; no new endpoint if avoidable.

### Out of scope

- No schema change (statuses already exist on `Project`).
- No change to how tasks STORE status (still canonical/flow-validated per N131) — this is picker UX only.
- No change to canonical `TASK_STATUSES`.

## Implementation plan

1. **FlowEditor `TriggerOptions`.** Pass/derive `project.statuses` and render them as a "Flow statuses" optgroup in addition to the existing custom-states + canonical groups. Dedup against canonical (a flow whose `statuses` IS the canonical enum shouldn't double-list).
2. **ModuleForm pickers.** Implement the chosen behavior from the Open question (minimal). At least keep canonical; if a flow context is resolvable, include its statuses.
3. **Tests/verify** — light; primarily manual in the editor.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean; build OK.
- In `pnpm play` with a custom-status flow: drawing/editing an edge offers the flow's own statuses in the trigger picker; canonical statuses still present.

## Notes

- Source: N143/N146 REVIEW.md ("custom-flow statuses not selectable").
- **Open question (resolve minimally during implementation):** a custom module is global (not bound to one flow), so `ModuleForm` has no single flow context. Options: (a) canonical-only in ModuleForm but flow-aware in FlowEditor (simplest); (b) ModuleForm offers the union of all known flows' statuses. Pick the smallest coherent option and note it in the spec/PR. Independent of N153/N154/N156.
