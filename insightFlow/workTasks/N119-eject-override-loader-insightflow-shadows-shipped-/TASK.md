# N119 — Eject/override loader — insightFlow/ shadows shipped defaults

**Type:** feat
**Priority:** high
**Created:** 2026-06-15

## Problem

- Built-in modules/agents/projects are package-compiled and immutable: the user-space loader (`agents/user-registry.ts`) rejects any `insightFlow/` file whose id collides with a built-in (N102). The human wants DEFAULTS to be editable via an eject/override model — a local copy in `insightFlow/` that shadows the shipped definition — except a LOCKED tier that stays read-only.

## Goal

1. A file in `insightFlow/{modules,agents,projects}` whose id matches a BUILT-IN id (not `custom:`) is loaded as an **eject/override** that shadows the package-shipped definition (resolution: override first, shipped fallback) — not a collision error.
2. A declared **LOCKED set** (the security/enforcement/protocol baseline + status-transition modules) is rejected as an override (cannot be ejected).
3. `custom:` ids keep their current behavior (additive, full CRUD).
4. Merged registries (`mergedModuleRegistry`/`mergedComposedAgents`/`mergedProjects`) reflect overrides so every consumer sees the ejected version.

## Scope

### In scope

- `packages/taskflow/src/agents/user-registry.ts` — accept built-in-id overrides (replace the collision-reject for non-`custom:` ids that match a built-in); reject LOCKED ids; keep dangling-ref + malformed-JSON guards.
- A `LOCKED_IDS` set (or a `locked` flag convention) covering the baseline + transition modules.
- Tests: eject a default module → merged registry returns the override; locked id override → rejected; custom unchanged; non-existent built-in id override → rejected (must match a real shipped id).

### Out of scope

- The CRUD/UI that WRITES overrides (N120). The default-flow eject UI (N121). The status-transition module kind (N128 defines the transition modules that are locked).
- Removing the built-in collision protection for genuinely unknown ids — an override must match a real shipped id.

## Implementation plan

1. **Override rule** — for a non-`custom:` id, if it matches a built-in and is not LOCKED, load it as an override (shadow); else reject (locked / unknown).
2. **Locked set** — enumerate the baseline (security/enforcement/protocol) + a hook for transition modules (N128).
3. **Merge** — overrides replace the shipped entry in the merged maps; resolution order documented.
4. **Tests** — eject/override/locked/custom matrix.

## Verification

- `pnpm build` + suite green.
- Drop `insightFlow/modules/security.json`-style override for a NON-locked default → merged registry/`/api/modules` shows the override; a locked-id override is rejected with a clear error.
- Existing custom modules + built-ins still load.

## Notes

- Foundation of the editable-defaults epic; everything in Epics 1/4 rides on it. See N119/ANALYSIS.md for the full program.
- flowId/override values are project ids; locked tier is the human's read-only-even-ejected requirement.
