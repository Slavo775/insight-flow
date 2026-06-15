# N133 — Agent role prompts emit status via the flow

**Type:** rework
**Priority:** low
**Created:** 2026-06-15

## Problem

- Role prompts tell agents to emit specific canonical statuses ('mark implemented'). For a custom flow's agents to emit that flow's CUSTOM statuses, the prompts/transition modules must set status through the flow-validated setter (N131) rather than hardcoded literals — closing the full-custom-statuses loop.

## Goal

1. Role prompts / `status-transition` modules set status via the N131 flow-validated setter instead of hardcoded literals.
2. A custom flow's agents emit that flow's custom statuses; the flow's `status-transition` modules supply the targets.
3. Shipped roles on the **default flow** are unchanged (canonical wording + statuses).
4. Closes the loop: define a flow with custom statuses + transition modules → its agents drive tasks through those statuses end-to-end.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/` + `prompt-build` — transition wording derives from the agent's `status-transition` module (N128) routed through N131; regenerate the role files.
- `sync-role-templates.mjs` — keep templates in sync.
- Tests: default roles' status emissions byte-identical; a custom flow's agent emits its custom status; drift suite green.

### Out of scope

- The setter/pickers (N131/N132). Status data (N128). UI (N129/N130).
- Changing the shipped canonical roles' behavior.

## Implementation plan

1. **Derive** — each agent's transition wording/target comes from its `status-transition` module via the N131 setter.
2. **Regenerate** — role files + templates re-synced; default byte-identical.
3. **Tests** — default parity + custom-status emission + drift.

## Verification

- `pnpm build` + suite green; drift suite ×N green; default roles unchanged.
- End-to-end: a custom flow's task moves through its custom statuses driven by its agents.

## Notes

- Final task — closes full custom statuses. Depends on N128/N131. See N119/ANALYSIS.md.
- Default-flow parity preserved; custom flows fully self-driving.
