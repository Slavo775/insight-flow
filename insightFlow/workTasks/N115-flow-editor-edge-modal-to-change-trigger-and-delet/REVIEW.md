# N115 — Flow editor — edge modal to change trigger and delete relationship — Review

Anchors the AI review for the **N113–N115 round** (flow editor full authoring),
reviewed as a unit.

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-15
**Verdict:** approved

## Summary

N113 (new flow picks its own agents), N114 (add/remove agents in edit mode),
N115 (edge modal to change trigger + delete) all implement their specs and the
two /task-analyze decisions (pick agents up front; click→popover/modal). Build
green, 170/170 tests, typecheck/lint/format clean. No blockers.

## Checklist verification

- **N113** — duplicate-from-default is now opt-in (default off); custom path shows an
  agent multi-select (built-in + custom, default none); "pick at least one" blocks
  submit (schema `agents.min(1)` untouched); duplicate path copies verbatim. Pass.
- **N114** — editor draft carries `agents`; Add palette lists registry agents not in the
  flow; node popover "Remove from flow" drops the node + its incident edges; Save persists
  the set; read-mode navigation unchanged. Pass. Contract test proves the editor MUST
  cascade (PUT removing an agent but leaving its edges → 400).
- **N115** — edge click → modal; trigger picker (canonical ∪ this flow's custom states via a
  shared `TriggerOptions`); change validated as remove-old + add-new (duplicate-(from,to,on)
  rejected inline); delete; keyboard Delete retained. Pass.

## Blockers

None.

## Non-blocking

1. **Alias redundancy in edge triggers (pre-existing, N110/N112-rooted — not introduced here).**
   The duplicate-(from,to,on) guard compares raw trigger strings, so an edge A→B on a custom
   state and another A→B on the canonical status it `mapsTo` are NOT flagged as duplicates
   even though they resolve to the same status. `suggestNextSteps`/`currentFlowNodes` dedup by
   agent so there's no visible double-suggestion, but it's a latent modeling redundancy.
   Hardening would resolve the trigger before the duplicate check.
2. **Removing all agents → Save → 400 with a raw message.** `describeIssues` only prettifies
   `flow.N` paths, so an `agents.min(1)` rejection surfaces as "Validation failed: agents: …".
   Loud and correct, just less friendly than the edge errors. Minor polish.
3. **`useRegistry()` now runs on every /project visit including read mode** where it's only
   needed in edit mode — two unused fetches (cached, harmless). A lazy fetch on entering edit
   mode would avoid them. Micro-optimization.

## Security & edge cases

- Agent set edits flow through the same N111 PUT + whole-record `ProjectSchema` validation;
  orphaned edges, duplicate triggers, and unknown agents are all rejected server-side.
- Custom ids remain bijective (N103 review-fix) — unaffected by this round.

## Notes

- `master-boot.test.mjs` flaked once during N115's suite run (fetch failed), passed in
  isolation and on rerun — a test-isolation flake worth a dedicated fix task, not a product bug.
- No React component test harness in this repo; editor behavior is guarded by typecheck + the
  API contract tests (N106–N113 precedent).
