# N95 — Bundle module kind — modules composed of modules

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11

## Problem

- Modules can't compose: an integration spanning multiple atoms (the existing `testing/prompt|hook|skill`, future `figma` = figma-MCP + figma-prompt) is only a namespace convention — every adopter must list each sibling id by hand (playground `test-runner.json` lists all three). The atomic-design model (human, 2026-06-11) needs reusable molecules below the agent level.

## Goal

1. New `kind: "bundle"` in `AgentModuleSchema`: `{ id, title, description, kind: "bundle", modules: [registry ids] }`.
2. Recursive resolution in `resolveModules` (the single path shared by `composeAgent` + `collectArtifacts`): bundles expand depth-agnostically with the existing first-wins dedup and a new **cycle guard** (throw, naming the cycle).
3. Pilot from existing data: a `testing` bundle wrapping the three `testing/*` siblings; the playground `test-runner` def adopts the single bundle id with identical emitted artifacts/MD.
4. N93 browser renders bundles (kind badge + children) and the module-detail map shows bundle → children edges.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — bundle variant in the discriminated union (`modules: z.array(z.string().min(1)).min(1)`).
- `packages/taskflow/src/agents/compose.ts` — `resolveModules` recursion + cycle guard; `collectArtifacts`/`composeAgent` unchanged externally.
- `packages/taskflow/src/agents/modules/integrations/testing.json` — add the `testing` bundle record (id `testing`, children the three existing ids).
- `playground/agents/test-runner.json` — adopt `testing` instead of the three siblings.
- `packages/taskflow/src/dashboard/client/ModuleDetail.tsx` (+ `CompositionMap` kind color) — bundle panel listing children (links), map edges bundle → children; `ModulesPage` grouping treats flat-id bundles as shared.
- Tests: `compose.test.mjs` / `emit.test.mjs` — expansion order (bundle children splice at the bundle's position), dedup across bundle/direct refs, cycle throw, unknown child throw, pilot equivalence (bundle adoption emits identical artifacts to listing siblings).

### Out of scope

- Authoring figma / chrome / any new integration content (pure data tasks later).
- Project layer (N96) — though its `install` will accept bundle ids via this same resolution.
- Shipped role changes (no role references a bundle; drift suite untouched).

## Implementation plan

1. **Schema** — add the bundle variant; no other kinds change.
2. **Resolution** — `resolveModules`: when a resolved module is a bundle, recursively expand its `modules` in place (declared order), carrying the seen-set for dedup and a path-stack for the cycle guard (`Bundle cycle: a → b → a`). Bundles themselves contribute no block/artifact — only their expansion.
3. **Pilot data** — `testing` bundle record; flip the playground def; verify artifacts byte-identical to before.
4. **Dashboard** — kind color + badge for `bundle`; detail panel "Contains N modules" with links; map variant: bundle node → child nodes (clickable). Registry test asserts flat bundle ids group as shared.
5. **Tests** — listed above; plus `/api/modules` serves bundles untouched (shape unchanged).

## Verification

- `pnpm build` + full suite green; drift suite untouched.
- Playground: `prompt-build --compose playground-test-runner --def agents/test-runner.json --apply` twice → identical artifacts to pre-bundle state, second run all `unchanged`.
- `/module/testing` shows the bundle with three linked children.

## Notes

- Atomic-design layering (human, 2026-06-11): modules = atoms, **bundles = molecules**, agents = organisms, project (N96) = the product. Bundles designed here so N96's `install` and future figma/chrome are one-id references.
- Cycle guard is the only new failure mode — keep the error message actionable.
- Implement before N96.
