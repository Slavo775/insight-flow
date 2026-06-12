# N107 — Agent composer form — add/remove/reorder modules

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- Composed agents are JSON-only artifacts; users need to assemble their own agents in the dashboard — picking modules (built-in + custom), ordering them, and saving — to actually use the customization layer end-to-end.

## Goal

1. `/agent` browser gains 'New agent' + 'Edit' on custom agents: form with title/description and an ordered module list — add from a searchable picker (grouped built-in vs custom, kind badges), remove, and reorder (drag or up/down controls).
2. Live composition preview: the ordered module titles render as the agent's structure (reusing the N93 composition view), updating as the list changes.
3. Saves via N103 `POST/PUT /api/agents`; referential validation errors (dangling module id) surface inline; built-in agents remain read-only.
4. A saved custom agent immediately appears in `/agent` and resolves through `prompt-build` (load-path already proven in N102).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — agent form page (routes `/agent/new`, `/agent/:id/edit`), module picker, reorder list component (reusable for N108+).
- Tests: picker filtering, reorder persistence order, server-error mapping.

### Out of scope

- Module authoring (N106). Flow placement of agents (N108–N110). Running agents from the UI. Bundle (N95) editing — bundles appear in the picker as installable items only if trivially supported, else excluded and noted.

## Implementation plan

1. **Form + list model** — ordered array of module ids with stable keys; add/remove/reorder operations.
2. **Picker** — search across merged registry (N102), group + badge by origin and kind.
3. **Preview** — feed current order into the existing composition renderer.
4. **Persist** — submit to N103, inline error mapping, navigate to `/agent/:id`.
5. **Tests** — reorder round-trip asserts saved order equals UI order.

## Verification

- Playground: build a custom agent from 3 modules (mix built-in + custom), reorder, save; `/agent/:id` shows the exact order; `prompt-build` composes it.
- Removing a module another flow references is not blocked here (agents reference modules; the 409 case lives on module delete — verified unaffected).

## Notes

- Depends on N102+N103; pairs with N106. Reorder component should be generic enough for N108's flow list.
