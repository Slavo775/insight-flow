# N137 — Analysis

## Problem framing

A user creating capabilities in the dashboard can make individual modules (`mcp-server`, `section`/prompt, `hook`, `skill`, `include`) but cannot group several into one reusable unit. Concretely: a "chrome" capability needed a chrome MCP module + a chrome prompt module, with no way to combine them — so every consuming agent must list both ids. The user asked for a new "composed module" kind whose form looks like the agent form (pick from a list of modules).

## Goal

Expose the **already-existing** `bundle` module kind in the module form, labeled "Composed module", with a multi-select module picker — so one bundle id can stand in for several modules on any agent.

## Options considered

1. **Add a brand-new "composed" kind** (schema + composer + UI). Rejected — duplicates the existing `bundle` kind (N95), which already does recursive expansion with dedup + cycle-guard.
2. **Expose the existing `bundle` kind in `ModuleForm`** (UI-only). Chosen — `core/schema/index.ts` (`kind: "bundle"` + `modules`) and `agents/compose.ts` `resolveModules` already implement everything; only `ModuleForm`'s `EditableKind`/`KINDS` omit it.
3. **Leave it JSON/registry-only.** Rejected — the whole point is a no-code dashboard affordance.

## Decision

Option 2. UI-only change. Label "Composed module" in the UI; keep underlying `kind: "bundle"` (no schema churn). Reuse `AgentForm`'s module-picker UX. Rely on the server's existing cycle/locked-id validation.

## Open questions

- Final label wording ("Composed module" vs "Bundle") — defaulting to "Composed module".
- Whether to show resolved/expanded children as a preview in the form (nice-to-have, not required).

## Sources

- `packages/taskflow/src/dashboard/client/ModuleForm.tsx` — `EditableKind`/`KINDS` omit `bundle`.
- `packages/taskflow/src/core/schema/index.ts` (~L346) — `bundle` kind already defined.
- `packages/taskflow/src/agents/compose.ts` — `resolveModules` expands bundles recursively (N95).
- `packages/taskflow/src/dashboard/client/api.ts` — `kind` union already includes `"bundle"`.

## Handoff brief

feat / low priority / tags: dashboard, modules, composer, ux. Add the `bundle` kind to `ModuleForm` as "Composed module" with a multi-select module picker bound to `modules`; no schema/composer change. Split from the same session as **N138** (agent → installable command/skill); this is the quick UI win.
