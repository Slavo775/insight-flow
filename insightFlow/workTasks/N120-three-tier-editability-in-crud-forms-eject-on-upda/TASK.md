# N120 — Three-tier editability in CRUD + forms (eject-on-update, locked read-only)

**Type:** rework
**Priority:** high
**Created:** 2026-06-15

## Problem

- The custom-defs CRUD (N103) hard-rejects any write to a non-`custom:` id (403 'built-ins are immutable'), and the module/agent forms (N106/N107) treat built-ins as read-only. With the N119 override loader in place, DEFAULTS should become editable (eject-on-save) while LOCKED defs stay read-only and built-ins still can't be deleted (only their override reverted).

## Goal

1. `PUT /api/{modules,agents,projects}/:id` for a BUILT-IN id is allowed and writes the eject/override file in `insightFlow/` — EXCEPT LOCKED ids (still 403).
2. `DELETE` of a built-in id stays 403 (you can't delete a shipped def); a separate **revert** removes the override file (restoring the shipped version).
3. Custom (`custom:`) CRUD is unchanged.
4. Module/agent forms: **Edit** appears on default defs (saving ejects), a **read-only** badge on locked defs, full CRUD on custom; a **Revert to shipped** action on ejected defs deletes the override.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/custom-defs.ts` — PUT built-in → write override (unless locked); DELETE built-in → 403; new revert path (DELETE override / `?revert`).
- `ModuleForm`/`AgentForm` — enable Edit for defaults, show locked badge, add Revert.
- Tests: PUT default → override written + merged reflects it; PUT locked → 403; DELETE default → 403; revert removes override.

### Out of scope

- The loader itself (N119). Default-flow eject (N121 — flow-specific UI). Status-transition module semantics (N128).
- Editing the shipped package files (overrides only ever live in `insightFlow/`).

## Implementation plan

1. **CRUD** — branch on id: custom (today) / locked (403) / default (PUT writes override, DELETE 403, revert removes override).
2. **Override write** — reuse the atomic write into `insightFlow/<kind>/`; revert = unlink the override.
3. **Forms** — editability per tier (Edit/locked-badge/Revert); reuse N106/N107 form machinery.
4. **Tests** — the tier matrix at the API + a form smoke.

## Verification

- `pnpm build` + suite green.
- Playground: edit a default module via the form → override file appears, dashboard shows the edited version; Revert removes it; a locked module shows read-only and PUT 403s.
- Custom CRUD still works.

## Notes

- Depends on N119. Pairs with N121 for flows. See N119/ANALYSIS.md.
- Three tiers: custom (CRUD) / default (read + eject-update + revert, no delete) / locked (read-only).
