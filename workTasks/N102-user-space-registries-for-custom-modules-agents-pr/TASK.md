# N102 — User-space registries for custom modules/agents/projects

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- The composer registry (modules, composed agents, projects) is compiled into the package — users cannot author their own. The customization layer needs user-space definitions living in the project under `insightFlow/`, using the exact same schemas as built-ins.

## Goal

1. Loader reads `insightFlow/modules/*.json`, `insightFlow/agents/*.json`, `insightFlow/projects/*.json`, validating with the existing Zod schemas (`ModuleSchema`/agent/`ProjectSchema`) — same data types as built-ins.
2. Merged registries: lookups see built-ins + custom entries; custom ids are namespaced (`custom:` prefix enforced on load) and collisions with built-in ids are rejected with a clear error.
3. Built-ins are immutable: user space can add, never shadow or mutate shipped entries.
4. Referential integrity at load: custom agents may reference built-in + custom modules; dangling refs fail loudly with file + id in the message.

## Scope

### In scope

- `packages/taskflow/src/agents/` — new `user-registry.ts` (load/validate/merge) wired into `compose.ts` lookups (`MODULE_REGISTRY`, `COMPOSED_AGENTS`) and the N96 project loader.
- `core/schema/index.ts` — only if id-pattern refinement is needed; schema shapes unchanged.
- Tests: valid custom module/agent/project loads; collision rejected; dangling ref rejected; malformed JSON reports filename.

### Out of scope

- Any write paths (N103). Dashboard UI (N106–N108). Custom states (N112).
- prompt-build consuming custom agents end-to-end is in scope only as a load-path smoke; new CLI flags are not.

## Implementation plan

1. **Loader** — read the three dirs (missing dirs = empty), Zod-parse each file, enforce `custom:` id prefix.
2. **Merge** — wrap registry access in `compose.ts` so built-in maps are extended, not replaced; resolution (incl. N95 bundles) works across the boundary.
3. **Validation** — collision + dangling-ref errors carry the offending file path.
4. **Tests** — fixtures in a temp project dir for the happy path and each failure mode.

## Verification

- Package tests green; a fixture custom agent composes via `prompt-build` in a temp project.
- Playground: drop a sample `insightFlow/modules/custom:greeting.json` → appears in `/api/modules` (read endpoint from N93).

## Notes

- Depends on N99 (root resolver) and conceptually on N101 (layout). Builds on N89 registry, N95 `resolveModules`, N96 project loader.
- API mutations (N103) and forms (N106/N107) sit on top of this loader.
