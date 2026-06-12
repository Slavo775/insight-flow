# N95 — Bundle module kind — modules composed of modules — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

Human's atomic-design refinement (2026-06-11, verbatim intent): *"modules can put together too but create still module … chrome browser tester needs mcp module and prompt module … figma module should have figma mcp and figma prompt"* — with the explicit scope correction that **the relationship mechanism is in scope; authoring figma/chrome content is not**. The N92 `testing/*` siblings prove the need: grouping exists only as a naming convention, and every adopter lists each sibling by hand.

## Goal

- One id references a whole integration; resolution is recursive, deduped, cycle-safe; existing data (`testing`) pilots it; the browser renders it.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — `kind: "bundle"` referencing ids (chosen) | One primitive added; recursion reuses `resolveModules`; bundles browsable like any module; N96 `install` + future integrations get one-id refs | Needs a cycle guard | S–M |
| B — Namespace auto-grouping (`testing/*` implies a group) | No schema change | Implicit magic; no description/title for the group; can't mix namespaces in one unit | S |
| C — Bundles only at the agent/project level (lists of lists) | No new kind | Pushes composition complexity up a layer; figma couldn't be one registry entry | M |

## Decision

- Chosen: **A** (human-confirmed direction). Bundles are the "molecule" tier: modules = atoms, bundles = molecules, agents = organisms, project (N96) = product.

## Open questions

- [non-blocking] Should a bundle be allowed to contain another bundle from day one? Resolution is depth-agnostic anyway — allow it, the cycle guard covers abuse.
- [non-blocking] Grouping in the modules sidebar: flat-id bundles land under "Shared" — acceptable, or give bundles their own group? Implementer picks.
- [non-blocking] Does `referencedBy` count bundle membership as a reference? Recommend yes (children show "contained in: testing").

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, 2026-06-11, trust: high): `packages/taskflow/src/agents/compose.ts` (`resolveModules` — the single resolution path), `modules/integrations/testing.json` (the sibling group becoming the pilot), `playground/agents/test-runner.json` (the adopter that shrinks to one id).

## Handoff brief

> Title: Bundle module kind — modules composed of modules · Type: feat · Priority: medium · Tags: agents, composer, schema, bundles.
> New `kind: "bundle"`: a module whose `modules: [ids]` expands recursively in `resolveModules` (first-wins dedup, cycle guard). Pilot: a `testing` bundle over the existing three siblings, adopted by the playground def with identical output. Dashboard renders bundles + children edges. Out of scope: figma/chrome content. Implement before N96.
