# N167 — Flow removal + default-flow override (feature)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-22
**Reframed:** 2026-06-22 — was filed as a "bug"; the human confirmed it was an *unimplemented* feature being tested, not a defect. Now scoped as a feature.

> Note: the shard still records `type: fix` and `status: in-progress` (no CLI exists to change a task's type/status — see N170). The doc is the source of truth; the implementer should treat this as a `ready` feature.

## Problem

There's no way to **remove a flow** or to **make a custom flow the active default** without giving it `entryAgents` (start points). Tasks fall back to the default taskmaster flow, and a custom flow only becomes selectable once it has a start point. The user expected to remove/override the default and found the behaviour missing (not broken).

## Goal

1. **Remove a custom flow** reliably from the dashboard (delete persists; it disappears from the list).
2. **Set a custom flow as the default** for new tasks **without** requiring `entryAgents` — surface the existing `flows.defaultFlow` lever in the UI.
3. **Unify default-flow resolution** so the shipped default taskmaster is just another resolvable flow that the override can replace.

## Scope

### In scope

- `core/config.ts` — the existing `flows.defaultFlow` / `flows.byType` mechanism (the binding lever).
- Dashboard: a "set as default flow" control on `ProjectPage.tsx` + the flow delete path (`custom-defs` projects delete already passes the guard).
- Flow-resolution / task-binding (N116/N122/N123) — honour the configured default uniformly.

### Out of scope

- Terminal nodes (N166/N169), idempotent install (N164) — unrelated flow-model work.
- Per-type flow mapping UI beyond surfacing `defaultFlow` (could be a follow-up).

## Implementation plan

1. **Reproduce + map** — confirm exact current behaviour in `is-test`: what flow a new task binds to, what removing a flow writes, how `flows.defaultFlow`/`byType` feed `set-flow`/binding (N116/N123).
2. **Default override** — let the dashboard write `flows.defaultFlow` (and optionally `byType`) so a custom flow becomes the binding default without `entryAgents`.
3. **Resolution** — ensure task creation resolves the configured default uniformly (the shipped default is just the fallback when none is configured).
4. **Remove flow** — verify/implement that deleting a custom flow persists and clears any `defaultFlow`/`byType` reference to it (no dangling binding).
5. **Tests** — binding picks the configured default; deleting a referenced flow clears the reference.

## Verification

- In `is-test`: set a custom flow as default → a new task binds to it (no start point needed); remove a flow → it's gone and nothing rebinds to it.
- `pnpm --dir packages/taskflow test` passes (binding/removal tests).

## Notes

- Design-led: run through analysis before coding (it touches flow binding/resolution). See ANALYSIS.md. Related: N169 (flow editor), N116/N122/N123 (flow binding).
