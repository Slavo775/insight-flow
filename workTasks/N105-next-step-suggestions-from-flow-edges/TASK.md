# N105 — Next-step suggestions from flow edges

**Type:** feat
**Priority:** high
**Created:** 2026-06-12

## Problem

- Knowing where a task is (N104) is half the value; the dashboard should also say what can happen next. After `task-review-fix`, the legitimate next steps are re-review, human review, or task-git — the flow's outgoing edges encode exactly this, but nothing surfaces it.

## Goal

1. `suggestNextSteps(status, flow)` helper: from the task's current status, outgoing flow edges yield one or more suggested next agents with their trigger labels — multiple branches are first-class (approved → human-review *and* task-git; fix-needed → review-fix; fixed → re-review *or* human-review).
2. Task detail page lists the suggestions ('Suggested next: …') with the agent's slash command shown for copy (e.g. `/task-review`); the N104 map highlights the suggested target nodes with a secondary style.
3. Suggestions only: `next`/`next-review`/`next-fix` pickers and the status state machine are untouched (N96 descriptive-now contract).
4. Empty/terminal statuses (merged/done) show a terminal note instead of suggestions.

## Scope

### In scope

- Shared helper module (server or client-shared) + unit tests over the shipped default flow for every status.
- `packages/taskflow/src/dashboard/client/` task detail page suggestion list + secondary highlight in `FlowMap`.
- `/api/work-tasks` / task payloads only if the client lacks needed fields (avoid if possible).

### Out of scope

- Mutating actions from suggestions (no 'run this agent' buttons this round). Picker/CLI behavior changes. Custom states (N112).

## Implementation plan

1. **Helper** — pure function `(status, flow) → [{agentId, title, command, on}]`; table-driven tests asserting the exact expected suggestion sets per status, including multi-branch cases.
2. **UI list** — suggestion chips on the task page linking to `/agent/:id`; slash command rendered as copyable code.
3. **Map tie-in** — pass suggested node ids to `FlowMap` as secondary highlights alongside N104's current node.
4. **Edge cases** — terminal statuses, statuses absent from the flow, multiple outgoing edges with the same target.

## Verification

- Unit tests enumerate suggestions for all canonical statuses and match the lifecycle (incl. change-request + incident side-flows).
- Playground: a `fixed` task suggests re-review and human-review; an `approved` task suggests human-review/task-git; a `merged` task shows the terminal note.

## Notes

- Depends on N104 (mapping helper + highlight plumbing). This is the 'prescriptive-lite' boundary of the round — see ANALYSIS.md in N99.
