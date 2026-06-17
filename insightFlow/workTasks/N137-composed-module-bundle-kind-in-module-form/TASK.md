# N137 — Composed-module (bundle) kind in module form

**Type:** feat
**Priority:** low
**Created:** 2026-06-17

## Problem

- The dashboard module form (`ModuleForm`) can only create `section | include | mcp-server | hook | skill` modules — there is no way to create a module that groups other modules. A user building, e.g., a "chrome" capability must create separate `mcp-server` (chrome MCP) and `section` (chrome prompt) modules with no way to bundle them, then list both ids on every agent. The data model already supports this via the `bundle` kind (N95), but the UI never exposes it.

## Goal

1. The module form offers a new creatable kind, labeled **"Composed module"**, that produces a `kind: "bundle"` module.
2. The bundle form presents a **multi-select list of existing modules** (mirroring the agent form's module picker) and saves the chosen ids to the module's `modules` array.
3. Self-reference / empty selection are blocked client-side; server-side cycle-guard + locked-id rules remain authoritative.
4. No schema or composer change — a saved bundle resolves and expands recursively exactly as today.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/ModuleForm.tsx` — add `"bundle"` to `EditableKind` + `KINDS` (label "Composed module"), render a bundle branch with a module multi-select bound to `modules: string[]`, init/serialize state, id preview.
- `packages/taskflow/src/dashboard/client/api.ts` — the `kind` union already includes `"bundle"`; extend the editable client type/state if needed.
- Reuse the module-picker UX from `AgentForm.tsx` / `CompositionMap` rather than building a new selector.

### Out of scope

- Schema (`core/schema/index.ts`) and composer (`agents/compose.ts`) — `bundle` (`kind: "bundle"` + `modules`) and recursive `resolveModules` expansion already exist (N95). No change.
- The agent → installable command/skill feature (**N138**).
- Server storage / write endpoint (bundles save through the existing module write path).

## Implementation plan

1. **Expose the kind.** Add `"bundle"` to `EditableKind` and `KINDS` in `ModuleForm.tsx`; render it in the kind selector as "Composed module".
2. **Bundle form branch.** When `kind === "bundle"`, render a multi-select over the merged module registry (built-in + custom + user-registry), bound to `modules`. Reuse `AgentForm`'s picker component/pattern.
3. **State + serialize.** Initialize bundle state (`modules: []`), and serialize the selected ids on save through the existing module-save call.
4. **Validation.** Require ≥1 selected module; exclude the module's own id from the pick list (no self-reference). Surface server validation errors (cycle, unknown id, locked id) inline.
5. **Preview.** Show the `custom:<slug>` id preview consistent with the other kinds.

## Verification

- In the dashboard, create a "Composed module" selecting `custom:chrome-mcp` + the chrome prompt module → a `insightFlow/modules/<id>.json` is written with `kind: "bundle"` and the chosen `modules`.
- Reference that bundle id from an agent's `modules` and compose (`insight-flow prompt-build --compose <agent> --def …`) → both children expand in place (prompt text + `.mcp.json` entry) with no errors.
- Attempting to add the bundle to itself, or selecting nothing, is blocked.
- `pnpm typecheck` (incl. client) + `pnpm --dir packages/taskflow lint` + `format:check` pass.

## Notes

- The backend is already done: `bundle` kind in `core/schema/index.ts` (~line 346) and recursive, dedup'd, cycle-guarded expansion in `agents/compose.ts` (`resolveModules`, N95). This task is UI-only.
- Decision: label it **"Composed module"** in the UI but keep the underlying `kind: "bundle"` — no schema churn.
- Related: **N138** (agent → installable command/skill). These were split from one analysis session; this is the quick UI win.
