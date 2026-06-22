# N171 — Templated ${VAR} inputs in non-mcp module kinds (hooks, prompts)

**Type:** feat
**Priority:** low
**Created:** 2026-06-22

## Problem

N165's templated `${VAR}` inputs + substitution are scoped to mcp-server `config` (the only concrete need so far: context7's header API key). Hook commands/scripts and prompt/section bodies can't yet declare collected `${VAR}` inputs. Speculative — recorded as a known seam; no flow needs it today.

## Goal

1. Generalise the `${VAR}` scan + substitution to hook commands/scripts and prompt bodies.
2. Reuse the N165 input-collection + gitignored secrets store (no second mechanism).
3. Reconcile with the existing `__KEY__` hook substitution so there's one placeholder convention.

## Scope

### In scope

- `core/inputs.ts` — already generic; wire it into the other artifact paths.
- `agents/emit.ts` `applyHooks` (and the command/prompt body paths) — substitute `${VAR}` from the values map.
- `agents/flow-install.ts` `flowRequiredInputs` — scan hook/prompt bodies for placeholders too.

### Out of scope

- The mcp path (shipped in N165).
- Building this without a concrete use case (see Notes — confirm need first).

## Implementation plan

1. **Confirm a use case** — do NOT start until a real flow needs a hook/prompt secret (YAGNI).
2. **Scan** — extend `flowRequiredInputs` to scan hook commands/scripts + prompt bodies via `scanPlaceholders`.
3. **Substitute** — apply `substituteVars` to those artifacts in `applyArtifacts`/`applyHooks` using the same values map.
4. **Reconcile syntax** — decide `${VAR}` vs the existing `__KEY__` hook tokens (one convention); migrate or bridge.
5. **Tests** — placeholder in a hook command resolves; required-inputs include it.

## Verification

- A hook/prompt with `${SOME_VAR}` surfaces an input, collects it, and substitutes on install.
- `pnpm --dir packages/taskflow test` passes.

## Notes

- **Speculative / parked** — strategist flagged YAGNI; build only when needed. Reuses N165's `core/inputs.ts` + secrets store. Related: N165, review finding #3 (shared `vars` map).
