# N171 — Templated ${VAR} inputs in non-mcp module kinds (hooks, prompts) — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- N165 added templated `${VAR}` inputs + install-time substitution, but **scoped to mcp-server `config`** (the only concrete need: context7's API key in a header). Other module kinds — hook commands/scripts, prompt/section bodies — can't yet declare collected `${VAR}` inputs.
- This is **speculative**: no shipped flow needs it today. It's recorded so the seam is known, not because there's a pull. (Strategist flagged it as YAGNI; the owner chose to track it.)

## Goal

1. Extend the `${VAR}` scan + substitution beyond mcp config to hook commands/scripts and prompt/section bodies.
2. Reuse the N165 input-collection + secrets-store path (no second mechanism).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Generalise `scanPlaceholders`/`substituteVars` across kinds + extend `flowRequiredInputs` | One consistent mechanism | Touches more artifact kinds; broader test surface | M |
| B — Per-kind opt-in (only kinds that declare `inputs[]`) | Smaller blast radius | Two notions of "templated kind" | M |
| C — Defer (status quo, mcp-only) | No work | The seam stays mcp-only | — |

## Decision

- Lean **A** *if/when a concrete need appears*; until then this stays **low priority / parked**. The N165 core (`core/inputs.ts` scan/substitute) is already generic over arbitrary values — the work is wiring it into the other artifact paths (hooks in `emit.applyHooks`, command/prompt bodies) and surfacing their placeholders in `flowRequiredInputs`.

## Open questions

- `[blocking]` Is there a real use case? Without one this shouldn't be built (YAGNI). Confirm a concrete flow needs a hook/prompt secret before starting.
- `[non-blocking]` Hook substitution today uses `__KEY__` tokens (`applyArtifacts` `sub`); reconcile that with `${VAR}` so there aren't two placeholder syntaxes.
- `[non-blocking]` Avoid coupling secret values into hook commands inadvertently (the shared `vars` map — review finding #3).

## Sources

- `core/inputs.ts` (scan/substitute), `agents/emit.ts` (`applyHooks`, the `__KEY__` `sub`), `agents/flow-install.ts` (`flowRequiredInputs`) — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Templated `${VAR}` inputs in non-mcp module kinds (hooks, prompts) · type: feat · priority: low. Generalise N165's `${VAR}` scan/substitution + input collection beyond mcp config to hook commands/scripts and prompt bodies, reusing the same secrets store. Speculative — confirm a concrete need before building (YAGNI). Reconcile with the existing `__KEY__` hook substitution.
