# N194 — Authoring flow skeleton + self-setup categorization (second built-in flow) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/authoring-flow`)
**Verdict:** approved

> Batch review of the authoring-flow initiative (N194–N197), via a fan-out to a
> correctness reviewer over the highest-risk change (the `BUILTIN_PROJECTS`
> generalization). No blockers; one minor finding (recorded here).

## Summary

Ships the second built-in flow `composer-authoring` and generalizes the
hardcoded "the one built-in project is `default`" into a `BUILTIN_PROJECTS` set
across `project.ts`, `user-registry`, `custom-defs`, the dashboard API, and the
MCP guard. The generalization is **complete and consistent** — verified at every
site; the new flow loads, composes, ejects, reverts, and is correctly refused for
autonomous MCP edits. 314 tests + docs build green.

## Checklist verification

- [x] Second built-in flow shipped + registered (`/api/projects`, MCP `list(flow)`) — pass
- [x] Lifecycle edges incl. gated `create→analyze` + terminal `install→done`; entry = analyze/create — pass (8 agents, 10 edges)
- [x] `flowId` categorization, no new task `type` — pass; `set-flow`/`set-default-flow` bind it (derive from `mergedProjects`)
- [x] `BUILTIN_PROJECTS` generalization complete — pass (all `DEFAULT_PROJECT` residue is intentional: barrel export, defs, default-flow init hooks, default selection fallback)

## Blockers

None.

## Non-blocking

1. **Stale MCP tool description** — `src/mcp/composer.ts:~241`. The `update_*`
   tool description still says *"Locked modules and the default flow are
   refused,"* but the guard now refuses **any** built-in flow (`isBuiltinProjectId`).
   An MCP client reads this to predict behavior, so it understates the guard.
   Fix: `" and the default flow"` → `" and built-in flows"` (and the stale inline
   comment at ~172–175). One-line accuracy fix; behavior is already correct.
2. **Test coverage nit** — `composer-authoring`'s eject/revert/MCP-refusal aren't
   asserted *directly* (the shared code path is covered by the existing default-flow
   eject test). Optional.

## Security & edge cases

- `composer-authoring` cannot be wrongly deleted (no override → 403 "nothing to
  revert"); ejects correctly via PUT; MCP `update_flow` refuses it. Verified.
- Built-in flows get `revision: undefined` (eject driven by `ejected`/`definitionRevision`) — correct.

## Notes

- Decision trail: this folder's `ANALYSIS.md`. Siblings N195/N196/N197.
- Implementation order was N196→N195→N194→N197 (dependency-valid). Gates: 314/314 + website build clean.


---

## Round 2 — pending verdict

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-29
**Verdict:** fix-needed

### Summary

The authoring flow doesn't install the events/activity engine. Default flow
`install: ["activity"]`; authoring flow `install: ["mcp-composer"]` — no
`activity`. But all 8 authoring agents compose `actions` (phase markers), so their
events have nowhere to land (dashboard shows "Activity engine OFF"). Oversight.

### Blockers

1. (verbatim) "please also why the flow dont have events module>?"

   **Finding:** `project/authoring.json` `install` is `["mcp-composer"]` — missing
   `activity`. The default flow ships it; the authoring agents emit phase markers
   that the activity hooks capture, and review round 3 (#1) wired the agents to
   drive the tracker lifecycle — so the events engine should be installed with the
   flow for the timeline/kanban to actually populate.

   **Fix:** add `activity` to the authoring flow's `install`
   → `["activity", "mcp-composer"]`. (Tiny, valid — same module id the default
   flow uses.) Verify installing the flow registers the activity hooks.

### Non-blocking

None.

### Security & edge cases

None.

### Notes

Scope: `project/authoring.json` install list (N194's deliverable; N197 had added
`mcp-composer`). One-line addition. Holding for go-ahead before `/task-review-fix`.

---

## Round 2 — fixes applied

**By:** task-review-fix · **Date:** 2026-06-29

- **Added the events/activity engine to the authoring flow.**
  `project/authoring.json` `install` is now `["activity", "mcp-composer"]` (was
  just `mcp-composer`). The authoring agents' `actions` phase markers now have the
  hooks to land in, matching the default flow.

**Verified:** installing `composer-authoring` registers the activity hooks
(`.claude/settings.json` populated). **Gates:** tsc ✅ · build ✅ · lint ✅ · suite
**315/315** ✅. **Files:** `project/authoring.json`.
