# N122 — Project.entryAgents — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`ProjectSchema.entryAgents: string[]` (default `[]`), validated in superRefine to
be a subset of the flow's agents. The default flow declares
`["task-analyze","taskmaster"]`. Dashboard shows ★ · main badges; the editor
carries entry agents through edits. Tight and well-scoped.

## Checklist verification

- [x] `entryAgents` validated ⊆ `agents` (message names the offending id) — `flow-edit.test.mjs`.
- [x] Default flow declares its entry agents; empty ⇒ "not selectable by agent".
- [x] `/api/project` + `/api/projects` expose `entryAgents`.

## Blockers

None.

## Non-blocking

- None of note.

## Security & edge cases

- Subset validation prevents an entry agent outside the flow. Empty set is a first-class state (type-map / explicit-only selection).

## Notes

Consumed by N123 (binding) and N124 (slash commands).


## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-16
**Verdict:** Approved

### Notes

Human: "done create or via girhub and merge it into master"

Approved by the project owner; merging PR #99 into `main`.
